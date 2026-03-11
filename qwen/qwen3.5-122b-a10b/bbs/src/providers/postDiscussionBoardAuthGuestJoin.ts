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
  ip: string;
  body: IDiscussionBoardGuest.IJoin;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  // 1. Check for duplicate device fingerprint
  const existing = await MyGlobal.prisma.discussion_board_guests.findFirst({
    where: { device_fingerprint: props.body.deviceFingerprint },
  });
  if (existing) {
    throw new HttpException("Device fingerprint already registered", 409);
  }
  // 2. Generate UUIDs and timestamps
  const guestId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpires = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // 3. Create guest record
  const guest = await MyGlobal.prisma.discussion_board_guests.create({
    data: {
      id: guestId,
      device_fingerprint: props.body.deviceFingerprint,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Create session record
  const session = await MyGlobal.prisma.discussion_board_guest_sessions.create({
    data: {
      id: sessionId,
      discussion_board_guest_id: guestId,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 6. Return authorized guest
  return {
    id: guestId,
    displayName: undefined,
    token,
  } satisfies IDiscussionBoardGuest.IAuthorized;
}
