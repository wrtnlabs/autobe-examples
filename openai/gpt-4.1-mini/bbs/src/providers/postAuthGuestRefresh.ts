import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IEconPolDiscussionBoardGuest.IRequestRefresh;
}): Promise<IEconPolDiscussionBoardGuest.IAuthorized> {
  // Step 1: Verify and decode the refresh token
  const decoded = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
  };

  // Step 2: Validate that the token type is "guest"
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Find and validate the session and guest user
  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        econ_pol_discussion_board_guest_id: decoded.id,
        expired_at: {
          gt: new Date(),
        },
      },
      include: {
        guest: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Step 4: Generate new access and refresh tokens with the same session_id
  // Use current time string and toISOStringSafe for expiration strings
  const nowISOString = toISOStringSafe(new Date());
  const accessExpireISOString = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshExpireISOString = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 5: Update session expiration time in the database
  await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpireISOString },
  });

  // Step 6: Construct and return the IAuthorized response
  return {
    id: session.guest.id,
    username: session.guest.username,
    created_at:
      session.guest.created_at !== null
        ? toISOStringSafe(session.guest.created_at)
        : toISOStringSafe(new Date(0)),
    updated_at:
      session.guest.updated_at !== null
        ? toISOStringSafe(session.guest.updated_at)
        : toISOStringSafe(new Date(0)),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireISOString,
      refreshable_until: refreshExpireISOString,
    },
    expiresAt: accessExpireISOString,
  } satisfies IEconPolDiscussionBoardGuest.IAuthorized;
}
