import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
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
  // 1. Check if guest with same device_fingerprint already exists
  const existingGuest = await MyGlobal.prisma.hrm_platform_guests.findFirst({
    where: {
      device_fingerprint: props.body.device_fingerprint,
      deleted_at: null,
    },
  });
  // 2. Create or reuse guest record
  let guest: {
    id: string & tags.Format<"uuid">;
    device_fingerprint: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  };
  if (existingGuest) {
    guest = existingGuest;
  } else {
    const now = new Date();
    guest = await MyGlobal.prisma.hrm_platform_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.device_fingerprint,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  // 3. Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.create({
    data: {
      id: v4(),
      guest_id: guest.id,
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
        created_at: toISOStringSafe(new Date()),
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
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at !== null ? toISOStringSafe(guest.deleted_at) : null,
    sessions: [],
    token,
  } satisfies IHrmPlatformGuest.IAuthorized;
}
