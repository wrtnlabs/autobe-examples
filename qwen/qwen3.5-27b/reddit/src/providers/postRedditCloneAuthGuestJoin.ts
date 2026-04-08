import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneGuestSessionTransformer } from "../transformers/RedditCloneGuestSessionTransformer";
import { RedditCloneGuestTransformer } from "../transformers/RedditCloneGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthGuestJoin(props: {
  ip: string;
  body: IRedditCloneGuest.IJoin;
}): Promise<IRedditCloneGuest.IAuthorized> {
  // 1. Check if guest with device_fingerprint already exists
  const existing = await MyGlobal.prisma.reddit_clone_guests.findFirst({
    where: {
      device_fingerprint: props.body.device_fingerprint,
      deleted_at: null,
    },
  });
  // 2. Create or use existing guest
  let guest: Prisma.reddit_clone_guestsGetPayload<
    ReturnType<typeof RedditCloneGuestTransformer.select>
  >;
  if (existing) {
    // Update existing guest's updated_at timestamp
    guest = await MyGlobal.prisma.reddit_clone_guests.update({
      where: { id: existing.id },
      data: {
        updated_at: new Date(),
      },
      ...RedditCloneGuestTransformer.select(),
    });
  } else {
    // Create new guest
    guest = await MyGlobal.prisma.reddit_clone_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.device_fingerprint,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...RedditCloneGuestTransformer.select(),
    });
  }
  // 3. Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.create({
    data: {
      id: v4(),
      reddit_clone_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: new Date(),
      expired_at: accessExpires,
    },
    ...RedditCloneGuestSessionTransformer.select(),
  });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 5. Return IAuthorized
  return {
    ...(await RedditCloneGuestTransformer.transform(guest)),
    token,
  } satisfies IRedditCloneGuest.IAuthorized;
}
