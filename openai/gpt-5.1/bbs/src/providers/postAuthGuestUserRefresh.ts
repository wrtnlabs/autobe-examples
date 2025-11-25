import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

export async function postAuthGuestUserRefresh(props: {
  guestUser: GuestuserPayload;
  body: IDiscussionBoardGuestUser.IRefresh;
}): Promise<IDiscussionBoardGuestUser.IAuthorized> {
  // 1. Verify and decode the refresh token
  let rawDecoded: unknown;
  try {
    rawDecoded = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch (_error) {
    // Do not leak cryptographic details
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Narrow the decoded payload structurally (JWT payload, not API DTO)
  const isObject = typeof rawDecoded === "object" && rawDecoded !== null;
  if (!isObject) {
    throw new HttpException("Invalid token payload", 401);
  }

  const maybeDecoded = rawDecoded as {
    id?: unknown;
    session_id?: unknown;
    type?: unknown;
  };

  if (
    typeof maybeDecoded.id !== "string" ||
    typeof maybeDecoded.session_id !== "string" ||
    typeof maybeDecoded.type !== "string"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }

  if (maybeDecoded.type !== "guestUser") {
    throw new HttpException("Invalid token type for guestUser refresh", 403);
  }

  const guestId: string = maybeDecoded.id;
  const sessionId: string = maybeDecoded.session_id;

  // 3. Load guest record and ensure it is active (not deleted)
  const guest = await MyGlobal.prisma.discussion_board_guestusers.findFirst({
    where: {
      id: guestId,
    },
  });

  if (!guest) {
    // Guest referenced by token no longer exists
    throw new HttpException("Guest identity does not exist", 401);
  }

  if (guest.deleted_at !== null) {
    // Logically closed guest identity
    throw new HttpException("Guest identity is not active", 403);
  }

  // 4. Compute new expiration timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 5. Generate new JWT tokens preserving the same session
  const nowIso = new Date().toISOString();

  const accessToken = jwt.sign(
    {
      id: guest.id,
      session_id: sessionId,
      type: "guestUser",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: guest.id,
      session_id: sessionId,
      type: "guestUser",
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6. Update guest's updated_at timestamp to reflect recent activity
  const updatedGuest = await MyGlobal.prisma.discussion_board_guestusers.update(
    {
      where: {
        id: guest.id,
      },
      data: {
        updated_at: new Date(),
      },
    },
  );

  // 7. Build authorization token DTO
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // 8. Map database record to IAuthorized DTO
  const result: IDiscussionBoardGuestUser.IAuthorized = {
    id: updatedGuest.id,
    anonymous_token: updatedGuest.anonymous_token,
    created_at: toISOStringSafe(updatedGuest.created_at),
    updated_at: toISOStringSafe(updatedGuest.updated_at),
    deleted_at:
      updatedGuest.deleted_at !== null
        ? toISOStringSafe(updatedGuest.deleted_at)
        : undefined,
    token,
  };

  return result;
}
