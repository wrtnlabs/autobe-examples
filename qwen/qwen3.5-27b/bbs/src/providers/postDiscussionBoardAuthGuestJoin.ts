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
  // 1. Find or create guest by device fingerprint
  let guest = await MyGlobal.prisma.discussion_board_guests.findFirst({
    where: {
      device_fingerprint: props.body.device_fingerprint,
    },
  });
  if (!guest) {
    // Create new guest
    guest = await MyGlobal.prisma.discussion_board_guests.create({
      data: {
        id: v4() as unknown as string & tags.Format<"uuid">,
        device_fingerprint: props.body.device_fingerprint,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // 2. Create session
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_guest_sessions.create({
    data: {
      id: v4() as unknown as string & tags.Format<"uuid">,
      discussion_board_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: refreshExpires,
    },
  });
  // 3. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as unknown as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as unknown as string &
      tags.Format<"date-time">,
  };
  // 4. Return authorized response
  return {
    id: guest.id as unknown as string & tags.Format<"uuid">,
    token,
  };
}
