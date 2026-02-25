import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthGuestRefresh(props: {
  body: IDiscussionBoardGuest.IRefresh;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  // 1. Verify session token
  let decoded: {
    session_id: string;
    type: "guest";
  };
  try {
    decoded = jwt.verify(
      props.body.session_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired session token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session =
    await MyGlobal.prisma.discussion_board_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest exists
  const guest = await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow(
    {
      where: { id: session.guest_id },
    },
  );
  // 5. Generate new tokens (SAME session_id)
  const accessExpires = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: decoded.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
  };
  // 6. Update session expiration (no expired_at field in schema)
  await MyGlobal.prisma.discussion_board_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      updated_at: new Date().toISOString(),
    },
  });
  // 7. Return response
  return {
    id: guest.id,
    ip_address: guest.ip_address,
    device_fingerprint: guest.device_fingerprint,
    created_at: guest.created_at.toISOString() satisfies string &
      tags.Format<"date-time">,
    updated_at: new Date().toISOString() satisfies string &
      tags.Format<"date-time">,
    session: token.access,
    expires_at: accessExpires,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
