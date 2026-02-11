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
  body: IRedditCommunityGuest.IJoin;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  // 1. Create guest account
  const guest = await MyGlobal.prisma.reddit_community_guests.create({
    data: {
      id: v4(),
      device_fingerprint: props.body.device_fingerprint,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 2. Create session
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: v4(),
      reddit_community_guest_id: guest.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });
  // 3. Generate JWT tokens
  const access = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 4. Construct token object
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 5. Return IAuthorized
  return {
    access,
    refresh,
    token,
  } satisfies IRedditCommunityGuest.IAuthorized;
}
