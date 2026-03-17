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
  const now = new Date();
  const sessionExpires = new Date(Date.now() + 72 * 60 * 60 * 1000);
  let guest = await MyGlobal.prisma.reddit_clone_guests.findFirst({
    where: {
      device_fingerprint: props.body.device_fingerprint,
      deleted_at: null,
    },
  });
  if (!guest) {
    guest = await MyGlobal.prisma.reddit_clone_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.device_fingerprint,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.create({
    data: {
      id: v4(),
      reddit_clone_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: sessionExpires,
    },
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const createdAt = now.toISOString();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: guest.id,
    token,
  };
}
