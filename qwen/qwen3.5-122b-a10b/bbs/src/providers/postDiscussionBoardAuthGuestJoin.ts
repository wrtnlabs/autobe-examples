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
  // 1. Check if device_fingerprint already exists
  const existingGuest = await MyGlobal.prisma.discussion_board_guests.findFirst(
    {
      where: {
        device_fingerprint: props.body.device_fingerprint,
        deleted_at: null,
      },
    },
  );
  let guestId: string & tags.Format<"uuid">;
  let createdAt: string & tags.Format<"date-time">;
  let updatedAt: string & tags.Format<"date-time">;
  let deletedAt: (string & tags.Format<"date-time">) | null;
  if (existingGuest) {
    guestId = existingGuest.id as string & tags.Format<"uuid">;
    createdAt = existingGuest.created_at.toISOString() as string &
      tags.Format<"date-time">;
    updatedAt = existingGuest.updated_at.toISOString() as string &
      tags.Format<"date-time">;
    deletedAt = existingGuest.deleted_at
      ? (existingGuest.deleted_at.toISOString() as string &
          tags.Format<"date-time">)
      : null;
  } else {
    // 2. Create new guest record
    const now = new Date();
    const newGuest = await MyGlobal.prisma.discussion_board_guests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        device_fingerprint: props.body.device_fingerprint,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    guestId = newGuest.id as string & tags.Format<"uuid">;
    createdAt = newGuest.created_at.toISOString() as string &
      tags.Format<"date-time">;
    updatedAt = newGuest.updated_at.toISOString() as string &
      tags.Format<"date-time">;
    deletedAt = null;
  }
  // 3. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_guest_id: guestId,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized response
  return {
    id: guestId,
    device_fingerprint: props.body.device_fingerprint,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
    token: token,
  } satisfies IDiscussionBoardGuest.IAuthorized;
}
