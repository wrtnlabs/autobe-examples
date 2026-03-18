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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthGuestJoin(props: {
  ip: string;
  body: ICommunityPlatformGuest.IJoin;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const nowIso = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const guest = await MyGlobal.prisma.community_platform_guests.upsert({
    where: { device_fingerprint: props.body.device_fingerprint },
    update: {
      updated_at: nowIso,
      deleted_at: null,
    },
    create: {
      id: v4(),
      device_fingerprint: props.body.device_fingerprint,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    },
  });
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.create({
      data: {
        id: v4(),
        community_platform_guest_id: guest.id,
        ip: props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
        expired_at: accessExpires,
      },
    });
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshableUntil,
  } satisfies IAuthorizationToken;
  return {
    id: typia.assert<string & tags.Format<"uuid">>(guest.id),
    created_at: toISOStringSafe(guest.created_at) satisfies string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(guest.updated_at) satisfies string &
      tags.Format<"date-time">,
    deleted_at:
      guest.deleted_at === null
        ? null
        : (toISOStringSafe(guest.deleted_at) satisfies string &
            tags.Format<"date-time">),
    device_fingerprint: guest.device_fingerprint,
    access_token: accessToken,
    refresh_token: refreshToken,
    token,
  } satisfies ICommunityPlatformGuest.IAuthorized;
}
