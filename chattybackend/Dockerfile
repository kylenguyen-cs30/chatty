
# ---------- 1. Build stage ----------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj và restore dependencies
COPY ["chattybackend.csproj", "./"]
RUN dotnet restore "chattybackend.csproj"

# Copy toàn bộ code và publish under Release configuration
COPY . .
RUN dotnet publish "chattybackend.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

# ---------- 2. Runtime stage ----------
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Copy build output từ stage trước
COPY --from=build /app/publish .

# Thiết lập port và entrypoint
ENV ASPNETCORE_URLS=http://*:${PORT:-8081}
EXPOSE 8081

ENTRYPOINT ["dotnet", "chattybackend.dll"]
