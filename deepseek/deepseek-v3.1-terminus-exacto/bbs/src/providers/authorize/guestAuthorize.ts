import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string; "device-fingerprint"?: string };
}): Promise<GuestPayload> {
  // First try JWT authorization for authenticated guests
  try {
    const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;
    
    if (payload.type !== "guest") {
      throw new ForbiddenException(`You're not ${payload.type}`);
    }

    // Verify guest exists and is active
    const guest = await MyGlobal.prisma.discussion_board_guests.findFirst({
      where: {
        id: payload.id,
        deleted_at: null,
      },
    });

    if (guest === null) {
      throw new ForbiddenException("You're not enrolled");
    }

    return payload;
  } catch (error) {
    // Fallback to device fingerprint authentication for anonymous guests
    const deviceFingerprint = request.headers["device-fingerprint"];
    
    if (!deviceFingerprint) {
      throw new ForbiddenException("Device fingerprint is required");
    }

    // Find guest by device fingerprint
    const guest = await MyGlobal.prisma.discussion_board_guests.findFirst({
      where: {
        device_fingerprint: deviceFingerprint,
        deleted_at: null,
      },
    });

    if (guest === null) {
      throw new ForbiddenException("Invalid device fingerprint");
    }

    // Check if guest has valid session
    const currentSession = await MyGlobal.prisma.discussion_board_guest_sessions.findFirst({
      where: {
        discussion_board_guest_id: guest.id,
        expired_at: {
          gt: new Date(),
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (currentSession === null) {
      throw new ForbiddenException("Guest session has expired");
    }

    // Return guest payload
    const payload: GuestPayload = {
      id: guest.id,
      session_id: currentSession.id,
      type: "guest",
      device_fingerprint: guest.device_fingerprint,
    };

    return payload;
  }
}