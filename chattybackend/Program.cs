using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.Concurrent;
using ChatAppBackend.Hubs;


var builder = WebApplication.CreateBuilder(args);


// Đảm bảo load env-vars và JSON config
builder.Configuration
       .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
       .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
       .AddEnvironmentVariables();

// Read a comma-separated list of allowed origins:
var origins = builder.Configuration
    .GetValue<string>("FRONTEND_URL", "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries);

Console.WriteLine("Allowed origins: " + string.Join(", ", origins));

// Chỉ cấu hình HTTP (Render sẽ xử lý HTTPS)
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(8080); // Chỉ dùng HTTP
});




// Tinh chỉnh CORS để dev frontend có thể access backend
builder.Services.AddSignalR();
builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowNextJs", policy =>
        {
            policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .SetPreflightMaxAge(TimeSpan.FromSeconds(600));
        });

    });


// Thiết kế hàm Singleton để giữ bộ nhớ ở trong chatroom
builder.Services.AddSingleton<RoomManager>();


var app = builder.Build();

// Tinh chinh Middleware
app.UseCors("AllowNextJs");
app.UseRouting();


// Đối chiếu với SignalR
app.MapHub<ChatHub>("/chatHub");


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
});

app.MapGet("/", () => "Chatty backend Online!!");

app.Run();



//đối tượng RoomManager để quản lý bộ nhớ nội
public class RoomManager
{
    private readonly ConcurrentDictionary<string, HashSet<string>> _rooms = new();


    public bool RoomExists(string roomCode)
    {
        return _rooms.ContainsKey(roomCode);
    }

    public bool AddUserToRoom(string roomCode, string connectionId)
    {
        return _rooms.AddOrUpdate(
            roomCode,
            new HashSet<string> { connectionId },
          (key, set) =>
          {
              set.Add(connectionId);
              return set;
          }
          ).Contains(connectionId);
    }


    // khi một trong những người tham gia thoát khỏi phòng. Phòng chat sẽ tự huỷ 
    public bool RemoveUserFromRoom(string roomCode, string connectionId)
    {
        if (_rooms.TryGetValue(roomCode, out var users))
        {

            users.Remove(connectionId);
            if (users.Count == 0)
            {
                _rooms.TryRemove(roomCode, out _); // room deconstructed
                return true;
            }
        }
        return false;
    }


    public HashSet<string> GetUsersInRoom(string roomCode)
    {
        if (_rooms.TryGetValue(roomCode, out var users))
        {
            return users;
        }
        else
        {
            return new HashSet<string>();
        }
    }
}
