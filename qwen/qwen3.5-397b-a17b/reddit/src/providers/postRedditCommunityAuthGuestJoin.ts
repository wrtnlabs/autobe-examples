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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthGuestJoin(props: {
  ip: string;
  body: IRedditCommunityGuest.IJoin;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  // 1. Check if device fingerprint already exists (not deleted)
  const existingGuest = await MyGlobal.prisma.reddit_community_guests.findFirst(
    {
      where: {
        device_fingerprint: props.body.deviceFingerprint,
        deleted_at: null,
      },
    },
  );
  // 2. Create new guest or use existing
  const guest =
    existingGuest ??
    (await MyGlobal.prisma.reddit_community_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.deviceFingerprint,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    }));
  // 3. Create session with expiration timestamps
  const accessExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: v4(),
      reddit_community_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
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
        id: guest.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
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
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Return IAuthorized response
  return {
    id: guest.id,
    token,
  } satisfies IRedditCommunityGuest.IAuthorized;
}
