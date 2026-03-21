import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
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
  body: IRedditCloneGuestSession.IJoin;
}): Promise<IRedditCloneGuestSession.IAuthorized> {
  // 1. Check for existing guest by fingerprint
  const existingGuest = await MyGlobal.prisma.reddit_clone_guests.findFirst({
    where: { fingerprint: props.body.fingerprint },
    select: { id: true },
  });
  // 2. Create new guest if not exists, otherwise reuse existing
  const guestId = existingGuest
    ? existingGuest.id
    : (
        await MyGlobal.prisma.reddit_clone_guests.create({
          data: {
            id: v4(),
            fingerprint: props.body.fingerprint,
            created_at: new Date(),
            updated_at: new Date(),
          },
        })
      ).id;
  // 3. Generate token expiration times (shorter than member tokens per spec)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // 4. Create session record
  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.create({
    data: {
      id: v4(),
      reddit_clone_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens with guest actor claim
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1d", issuer: "autobe" },
    ),
    expired_at:
      accessExpires.toISOString() as IAuthorizationToken["expired_at"],
    refreshable_until:
      refreshExpires.toISOString() as IAuthorizationToken["refreshable_until"],
  };
  // 6. Return IAuthorized with guest id and token
  return {
    id: guestId as IRedditCloneGuestSession.IAuthorized["id"],
    token,
  };
}
