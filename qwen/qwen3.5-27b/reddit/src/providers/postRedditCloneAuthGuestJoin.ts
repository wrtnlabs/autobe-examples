import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthGuestJoin(props: {
  ip: string;
  body: IRedditCloneGuest.IJoin;
}): Promise<IRedditCloneGuest.IAuthorized> {
  // 1. Check if device fingerprint already exists (idempotent)
  const existing = await MyGlobal.prisma.reddit_clone_guests.findFirst({
    where: {
      device_fingerprint: props.body.device_fingerprint,
      deleted_at: null,
    },
  });
  let guestId: string & tags.Format<"uuid">;
  if (existing) {
    guestId = existing.id as unknown as string & tags.Format<"uuid">;
  } else {
    // 2. Create new guest
    const newGuest = await MyGlobal.prisma.reddit_clone_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.device_fingerprint,
        ip_address: props.body.ip_address,
        user_agent: props.body.user_agent,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    guestId = newGuest.id as unknown as string & tags.Format<"uuid">;
  }
  // 3. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.create({
    data: {
      id: v4(),
      reddit_clone_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      user_agent: props.body.user_agent,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  const sessionId = session.id as unknown as string & tags.Format<"uuid">;
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as unknown as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as unknown as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized
  return {
    id: guestId,
    token,
  } satisfies IRedditCloneGuest.IAuthorized;
}
