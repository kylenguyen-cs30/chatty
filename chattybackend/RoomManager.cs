using System.Collections.Concurrent;

public class RoomManager
{
    private readonly ConcurrentDictionary<string, HashSet<string>> _rooms = new();
    private const int MaxRooms = 1000;

    public bool RoomExists(string roomCode)
    {
        return _rooms.ContainsKey(roomCode);
    }


    // create a new room with a unque roomCode
    public string? CreateRoom()
    {
        if (_rooms.Count() >= MaxRooms)
        {
            return null;
        }
        var roomCode = Guid.NewGuid().ToString("N").Substring(0, 8);
        bool added = _rooms.TryAdd(roomCode, new HashSet<string>());
        return added ? roomCode : null;

    }

    // Them nguoi dung vao trong phong 
    public bool AddUserToRoom(string roomCode, string connectionId)
    {
        if (!_rooms.ContainsKey(roomCode))
        {
            return false; // phong khong ton tai 
        }
        return _rooms.AddOrUpdate(
            roomCode,
            new HashSet<string> { connectionId },
            (key, set) =>
            {
                set.Add(connectionId);
                return set;
            }).Contains(connectionId);

    }


    // Xoa nguoi dung khoi phong chat 
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
