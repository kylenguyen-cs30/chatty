using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using System.Threading.RateLimiting;
using ChatAppBackend.Hubs;


var builder = WebApplication.CreateBuilder(args);


// Đảm bảo load env-vars và JSON config
builder.Configuration
       .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
       .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
       .AddEnvironmentVariables();

// Read a comma-separated list of allowed origins:
var frontendUrl = builder.Configuration.GetValue<string>("FRONTEND_URL");

if (string.IsNullOrEmpty(frontendUrl))
{
    frontendUrl = "http://localhost:3000";
}

var origins = frontendUrl.Split(',', StringSplitOptions.RemoveEmptyEntries);

Console.WriteLine("origins " + string.Join(", ", origins));



// Chỉ cấu hình HTTP (Render sẽ xử lý HTTPS)
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(8081); // Chỉ dùng HTTP
});


// Tinh chỉnh CORS để dev frontend có thể access backend
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowNextJs", policy =>
        {
            policy.WithOrigins(origins)
            // policy.AllowAnyOrigin() // de debug
            .AllowAnyHeader()
            .AllowAnyMethod()
            .SetPreflightMaxAge(TimeSpan.FromSeconds(600));
        });

    });


// Thiết kế hàm Singleton để giữ bộ nhớ ở trong chatroom
builder.Services.AddSingleton<RoomManager>();

// add RateLimiting
builder.Services.AddRateLimiter(options =>
{

    options.AddFixedWindowLimiter("ChatPolicy", opt =>
    {
        opt.PermitLimit = 50; // Giới hạn request cho mỗi IP address
        opt.Window = TimeSpan.FromSeconds(60); // Độ dài cửa sổ : 60s
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst; // Không cho phép chờ đợi vượt ngưỡng
        opt.QueueLimit = 0;
    });
});


var app = builder.Build();

// Tinh chinh Middleware
app.UseCors("AllowNextJs");
app.UseRouting();
app.UseRateLimiter();


// Đối chiếu với SignalR
app.MapHub<ChatHub>("/chatHub").RequireRateLimiting("ChatPolicy");


// optional REST API room code
app.MapGet("/api/rooms/{roomCode}", (string roomCode, RoomManager roomManager) =>
{
    bool roomExists = roomManager.RoomExists(roomCode);
    if (roomExists)
    {
        return Results.Ok();
    }
    else
    {
        return Results.NotFound();
    }
}).RequireRateLimiting("ChatPolicy");

// API Map Get 
app.MapPost("/api/rooms/create", (RoomManager roomManager) =>
{
    var roomCode = roomManager.CreateRoom();
    if (roomCode != null)
    {
        return Results.Ok(new { RoomCode = roomCode });
    }
    return Results.BadRequest("Cannont create more rooms due to limit");
}).RequireRateLimiting("ChatPolicy");

if (builder.Environment.IsDevelopment())
{
    app.MapGet("/", () => "Chatty backend Online!!");
}

app.Run();


