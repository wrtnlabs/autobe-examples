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
  body: IRedditCloneGuest.IJoin;
}): Promise<IRedditCloneGuest.IAuthorized> {
  // 1. Create or find guest record
  const guestId = v4();
  const guest = await MyGlobal.prisma.reddit_clone_guests.upsert({
    where: { id: guestId },
    create: {
      id: guestId,
      created_at: toISOStringSafe(new Date()),
    },
    update: {},
  });
  // 2. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.create({
    data: {
      id: v4(),
      guest_id: guest.id,
      session_token: props.body.session_token,
      device_id: props.body.device_id,
      ip: props.body.ip,
      referrer: props.body.referrer ?? null,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
    select: {
      id: true,
      session_token: true,
      device_id: true,
      expired_at: true,
    },
  });
  // 3. Generate JWT tokens
  const tokenPayload = {
    type: "guest" as const,
    id: guest.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    {
      ...tokenPayload,
      tokenType: "refresh" as const,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 4. Return response
  return {
    session_token: session.session_token,
    device_id: session.device_id,
    expired_at: toISOStringSafe(session.expired_at),
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IRedditCloneGuest.IAuthorized;
}
