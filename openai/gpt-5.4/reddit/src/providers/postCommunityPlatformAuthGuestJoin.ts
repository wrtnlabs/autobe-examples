import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformGuestTransformer } from "../transformers/CommunityPlatformGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthGuestJoin(props: {
  ip: string;
  body: ICommunityPlatformGuest.IJoin;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const nowMilliseconds = globalThis.Date.now();
  const accessExpiredMilliseconds = nowMilliseconds + 60 * 60 * 1000;
  const refreshExpiredMilliseconds = nowMilliseconds + 7 * 24 * 60 * 60 * 1000;
  const nowIso = new globalThis.Date(nowMilliseconds).toISOString();
  const accessExpiredIso = new globalThis.Date(
    accessExpiredMilliseconds,
  ).toISOString();
  const refreshExpiredIso = new globalThis.Date(
    refreshExpiredMilliseconds,
  ).toISOString();
  const guest = await MyGlobal.prisma.community_platform_guests.create({
    data: {
      id: v4(),
      guest_key: v4(),
      created_at: new globalThis.Date(nowIso),
      updated_at: new globalThis.Date(nowIso),
      deleted_at: null,
    },
    ...CommunityPlatformGuestTransformer.select(),
  });
  const sessionId = v4();
  await MyGlobal.prisma.community_platform_guest_sessions.create({
    data: {
      id: sessionId,
      guest: {
        connect: {
          id: guest.id,
        },
      },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new globalThis.Date(nowIso),
      expired_at: new globalThis.Date(accessExpiredIso),
    },
  });
  return {
    ...(await CommunityPlatformGuestTransformer.transform(guest)),
    token: {
      access: jwt.sign(
        {
          type: "guest",
          id: guest.id,
          session_id: sessionId,
          created_at: nowIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: "guest",
          id: guest.id,
          session_id: sessionId,
          tokenType: "refresh",
          created_at: nowIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: accessExpiredIso,
      refreshable_until: refreshExpiredIso,
    },
  };
}
