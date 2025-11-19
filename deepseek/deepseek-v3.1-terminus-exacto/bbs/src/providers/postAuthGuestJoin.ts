import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(): Promise<IDiscussionBoardGuest.IAuthorized> {
  try {
    // Generate unique identifiers
    const guestId = v4() as string & tags.Format<"uuid">;
    const guestToken = v4();
    const sessionId = v4() as string & tags.Format<"uuid">;

    // Calculate token expiration times
    const now = new Date();
    const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
    const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Create guest record
    const guest = await MyGlobal.prisma.discussion_board_guests.create({
      data: {
        id: guestId,
        guest_token: guestToken,
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
        deleted_at: null,
      },
    });

    // Create session record with all required fields
    const session =
      await MyGlobal.prisma.discussion_board_guest_sessions.create({
        data: {
          id: sessionId,
          discussion_board_guest_id: guestId,
          ip: "127.0.0.1", // Default IP for guest registration
          href: "/", // Default URL
          referrer: "", // Empty referrer
          created_at: toISOStringSafe(now),
          updated_at: toISOStringSafe(now),
          expired_at: toISOStringSafe(accessExpires),
        },
      });

    // Generate JWT tokens
    const token: IAuthorizationToken = {
      access: jwt.sign(
        {
          type: "guest",
          id: guestId,
          session_id: sessionId,
          created_at: toISOStringSafe(now),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: "guest",
          id: guestId,
          session_id: sessionId,
          tokenType: "refresh",
          created_at: toISOStringSafe(now),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };

    // Return guest identity with authentication token
    return {
      id: guestId,
      guest_token: guestToken,
      created_at: toISOStringSafe(guest.created_at),
      updated_at: toISOStringSafe(guest.updated_at),
      deleted_at: guest.deleted_at
        ? toISOStringSafe(guest.deleted_at)
        : undefined,
      token,
    };
  } catch (error) {
    // Handle potential database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException("Guest token collision detected", 409);
      }
      throw new HttpException("Database error during guest registration", 500);
    }
    throw new HttpException("Internal server error", 500);
  }
}
