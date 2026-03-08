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

export async function postDiscussionBoardAuthGuestJoin(props: {
  body: IDiscussionBoardGuest.IJoin;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  // Generate session token
  const sessionToken = v4() as string & tags.Format<"uuid">;
  // Create guest record
  const guest = await MyGlobal.prisma.discussion_board_guests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      session_token: sessionToken,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
      deleted_at: null,
    },
    select: {
      id: true,
      session_token: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Calculate expiration times
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Create session record
  const session = await MyGlobal.prisma.discussion_board_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      guest_id: guest.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
    select: {
      id: true,
      guest_id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
  });
  // Generate JWT tokens
  const accessPayload = {
    type: "guest",
    id: guest.id,
    session_id: session.id,
    created_at: new Date().toISOString(),
  };
  const refreshPayload = {
    type: "guest",
    id: guest.id,
    session_id: session.id,
    tokenType: "refresh",
    created_at: new Date().toISOString(),
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Construct response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    id: guest.id,
    session_token: guest.session_token,
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    token: token,
  } satisfies IDiscussionBoardGuest.IAuthorized;
}
