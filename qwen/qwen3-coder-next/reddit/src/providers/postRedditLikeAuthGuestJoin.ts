import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthGuestJoin(props: {
  ip: string;
  body: IRedditLikeGuest.IJoin;
}): Promise<IRedditLikeGuest.IAuthorized> {
  // Check for duplicate device_id
  const existingGuest = await MyGlobal.prisma.reddit_like_guests.findFirst({
    where: { device_id: props.body.device_id },
  });
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let guest: any;
  let session: any;
  if (existingGuest) {
    // Guest already exists - create session
    session = await MyGlobal.prisma.reddit_like_guest_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_guest_id: existingGuest.id,
        ip: props.ip,
        href: "/redditLike",
        created_at: now,
        expired_at: accessExpires,
        updated_at: now,
      },
    });
    guest = existingGuest;
  } else {
    // Create new guest
    guest = await MyGlobal.prisma.reddit_like_guests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        device_id: props.body.device_id,
        created_at: now,
        updated_at: now,
      },
    });
    // Create session for new guest
    session = await MyGlobal.prisma.reddit_like_guest_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_guest_id: guest.id,
        ip: props.ip,
        href: "/redditLike",
        created_at: now,
        expired_at: accessExpires,
        updated_at: now,
      },
    });
  }
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: guest.id,
    device_id: guest.device_id,
    token,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
  } satisfies IRedditLikeGuest.IAuthorized;
}
