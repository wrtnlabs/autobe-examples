import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthGuestJoin(props: {
  ip: string;
  body: IHrmPlatformGuest.IJoin;
}): Promise<IHrmPlatformGuest.IAuthorized> {
  // 1. Check if guest with same device fingerprint exists
  const existingGuest = await MyGlobal.prisma.hrm_platform_guests.findFirst({
    where: {
      device_fingerprint: props.body.device_fingerprint,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // 2. Create or reuse guest
  const guest = existingGuest
    ? existingGuest
    : await MyGlobal.prisma.hrm_platform_guests.create({
        data: {
          id: v4(),
          device_fingerprint: props.body.device_fingerprint,
          ip_address: props.body.ip_address,
          user_agent: props.body.user_agent ?? null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
  // 3. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.create({
    data: {
      id: v4(),
      hrm_platform_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
    select: {
      id: true,
    },
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
    id: guest.id,
    token,
  } satisfies IHrmPlatformGuest.IAuthorized;
}
