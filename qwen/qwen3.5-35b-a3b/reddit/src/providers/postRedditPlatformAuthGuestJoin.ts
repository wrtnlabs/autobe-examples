import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthGuestJoin(props: {
  ip: string;
  body: IRedditPlatformGuest.IJoin;
}): Promise<IRedditPlatformGuest.IAuthorized> {
  const {
    email,
    password,
    username,
    display_name,
    bio,
    avatar_url,
    href,
    referrer,
  } = props.body;
  const existing = await MyGlobal.prisma.reddit_platform_guests.findFirst({
    where: { email: email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const usernameExisting =
    await MyGlobal.prisma.reddit_platform_guests.findFirst({
      where: { username: username },
    });
  if (usernameExisting) {
    throw new HttpException("Username already taken", 409);
  }
  const ip = props.body.ip ?? props.ip;
  const created_at = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const updated_at = created_at;
  const deleted_at: (string & tags.Format<"date-time">) | null = null;
  const id = v4() as string & tags.Format<"uuid">;
  const password_hash = await PasswordUtil.hash(password);
  const guest = await MyGlobal.prisma.reddit_platform_guests.create({
    data: {
      id,
      email,
      password_hash,
      username,
      display_name,
      bio: bio ?? null,
      avatar_url: avatar_url ?? null,
      karma: 0,
      created_at,
      updated_at,
      deleted_at,
    },
  });
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session_id = v4() as string & tags.Format<"uuid">;
  const session_created_at = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const session_expired_at = accessExpires.toISOString() as string &
    tags.Format<"date-time">;
  const session = await MyGlobal.prisma.reddit_platform_guest_sessions.create({
    data: {
      id: session_id,
      reddit_platform_guest_id: guest.id,
      ip,
      referrer: referrer ?? null,
      href,
      created_at: session_created_at,
      expired_at: session_expired_at,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id,
        created_at,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id,
        tokenType: "refresh",
        created_at,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    id: guest.id,
    email: guest.email,
    username: guest.username,
    display_name: guest.display_name,
    bio: guest.bio,
    avatar_url: guest.avatar_url,
    karma: guest.karma,
    created_at: guest.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: guest.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at,
    sessions: [
      {
        id: session.id,
        reddit_platform_guest_id: session.reddit_platform_guest_id,
        href: session.href,
        referrer: session.referrer,
        ip: session.ip,
        created_at: session.created_at.toISOString() as string &
          tags.Format<"date-time">,
        expired_at: session.expired_at.toISOString() as string &
          tags.Format<"date-time">,
      },
    ],
    token,
  } satisfies IRedditPlatformGuest.IAuthorized;
}
