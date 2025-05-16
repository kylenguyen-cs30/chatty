using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;


namespace ChatAppBackend.Hubs
{
    public class ChatHub : Hub
    {
        private readonly RoomManager _roomManager;

        public ChatHub(RoomManager roomManager)
        {
            _roomManager = roomManager;
        }

        public async Task JoinRoom(string roomCode, string userName)
        {
            // add user to room 
            if (_roomManager.AddUserToRoom(roomCode, Context.ConnectionId))
            {
                // add user to the room 
                await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);

                // notify others in the room 
                await Clients.Group(roomCode).SendAsync("UserJoined", userName);

                // send confirmation to the caller
                await Clients.Caller.SendAsync("JoinedRoom", roomCode);

            }
            else
            {
                // notify for failure 
                await Clients.Caller.SendAsync("ERROR", "không kết nối được phòng !!");
            }
        }


        public async Task SendMessage(string roomCode, string userName, string message)
        {
            // phát sóng tin nhắn cho tất cả user trong phòng 
            await Clients.Group(roomCode).SendAsync("ReceiveMessage", userName, message);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // find the room user is in 
            string? roomCode = null;


            foreach (var room in _roomManager.GetRooms())
            {
                if (_roomManager.GetUsersInRoom(room.Key).Contains(Context.ConnectionId))
                {
                    roomCode = room.Key;
                    break;

                }

            }

            if (roomCode != null)
            {
                //check Context ConnectionId


                Console.WriteLine("What is this !!");
                Console.WriteLine(Context.ConnectionId);
                // remove user and check if the room should be deconstructed
                bool roomDeconstructed = _roomManager.RemoveUserFromRoom(roomCode, Context.ConnectionId);

                if (roomDeconstructed)
                {
                    // notify all clients that room has been deconstructed
                    await Clients.Group(roomCode).SendAsync("RoomDeconstructed", $"Room {roomCode} has been deconstructed");
                }
                else
                {
                    await Clients.Group(roomCode).SendAsync("UserLeft", Context.ConnectionId);
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

    }

}

//extenstion access room (used in OnConnectedAsync)
public static class RoomManagerExtensions
{
    public static IEnumerable<KeyValuePair<string, HashSet<string>>> GetRooms(this RoomManager roomManager)
    {
        return roomManager.GetType()
          .GetField("_rooms", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
          ?.GetValue(roomManager) as IEnumerable<KeyValuePair<string, HashSet<string>>>
          ?? Enumerable.Empty<KeyValuePair<string, HashSet<string>>>();
    }
}
