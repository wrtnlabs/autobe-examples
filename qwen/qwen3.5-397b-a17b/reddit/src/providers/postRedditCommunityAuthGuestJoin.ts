import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityGuestTransformer } from "../transformers/RedditCommunityGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthGuestJoin(props: {
  ip: string;
  body: IRedditCommunityGuest.IJoin;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  const now = new Date();
  const nowString = toISOStringSafe(now);
  // 1. Check if guest with same device fingerprint already exists
  const existingGuest = await MyGlobal.prisma.reddit_community_guests.findFirst(
    {
      where: { device_fingerprint: props.body.deviceFingerprint },
      include: { sessions: true },
    },
  );
  // 2. Create or retrieve guest record
  const guest = existingGuest
    ? existingGuest
    : await MyGlobal.prisma.reddit_community_guests.create({
        data: {
          id: v4(),
          device_fingerprint: props.body.deviceFingerprint,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        include: { sessions: true },
      });
  // 3. Create session with expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: v4(),
      reddit_community_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href ?? "",
      referrer: props.body.referrer ?? "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: nowString,
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
        created_at: nowString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized response
  return {
    ...(await RedditCommunityGuestTransformer.transform(guest)),
    token,
  } satisfies IRedditCommunityGuest.IAuthorized;
}
