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
import { RedditLikeGuestTransformer } from "../transformers/RedditLikeGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthGuestJoin(props: {
  ip: string;
  body: IRedditLikeGuest.IJoin;
}): Promise<IRedditLikeGuest.IAuthorized> {
  const nowTimestamp = Date.now();
  const sessionDurationMs = 24 * 60 * 60 * 1000; // 24 hours
  const refreshDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const nowISO = new Date(nowTimestamp).toISOString() as string &
    tags.Format<"date-time">;
  const accessExpiresISO = new Date(
    nowTimestamp + sessionDurationMs,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresISO = new Date(
    nowTimestamp + refreshDurationMs,
  ).toISOString() as string & tags.Format<"date-time">;
  // Find or create guest by device fingerprint
  const existingGuest = await MyGlobal.prisma.reddit_like_guests.findUnique({
    where: { device_fingerprint: props.body.deviceFingerprint },
    ...RedditLikeGuestTransformer.select(),
  });
  let guestId: string & tags.Format<"uuid">;
  let guestData: RedditLikeGuestTransformer.Payload;
  if (existingGuest) {
    guestId = existingGuest.id as string & tags.Format<"uuid">;
    guestData = existingGuest;
  } else {
    const newGuestId = v4() as string & tags.Format<"uuid">;
    const createdGuest = await MyGlobal.prisma.reddit_like_guests.create({
      data: {
        id: newGuestId,
        device_fingerprint: props.body.deviceFingerprint,
        created_at: new Date(nowTimestamp),
        updated_at: new Date(nowTimestamp),
        deleted_at: null,
      },
      ...RedditLikeGuestTransformer.select(),
    });
    guestId = newGuestId;
    guestData = createdGuest;
  }
  // Create session
  const sessionId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.reddit_like_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_like_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(nowTimestamp),
      expired_at: new Date(nowTimestamp + sessionDurationMs),
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1d", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresISO,
    refreshable_until: refreshExpiresISO,
  };
  // Transform and return
  const transformedGuest =
    await RedditLikeGuestTransformer.transform(guestData);
  return {
    ...transformedGuest,
    token,
  } satisfies IRedditLikeGuest.IAuthorized;
}
