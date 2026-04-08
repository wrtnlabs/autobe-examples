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
  // Generate or use provided device fingerprint
  const deviceFingerprint: string = props.body.device_fingerprint ?? v4();
  // Check for existing guest with same device fingerprint
  const existingGuest = await MyGlobal.prisma.hrm_platform_guests.findFirst({
    where: {
      device_fingerprint: deviceFingerprint,
      deleted_at: null,
    },
  });
  let guestId: string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (existingGuest) {
    // Guest already exists, use existing ID
    guestId = existingGuest.id satisfies string as string & tags.Format<"uuid">;
  } else {
    // Create new guest record
    const guest = await MyGlobal.prisma.hrm_platform_guests.create({
      data: {
        id: v4(),
        device_fingerprint: deviceFingerprint,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    guestId = guest.id satisfies string as string & tags.Format<"uuid">;
  }
  // Create session record
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.create({
    data: {
      id: v4(),
      hrm_platform_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  // Generate JWT tokens
  const sessionId: string & tags.Format<"uuid"> =
    session.id satisfies string as string & tags.Format<"uuid">;
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: guestId,
    token,
  } satisfies IHrmPlatformGuest.IAuthorized;
}
