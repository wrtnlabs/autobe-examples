import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthGuestJoin(props: {
  ip: string;
  body: IErpHrmGuest.IJoin;
}): Promise<IErpHrmGuest.IAuthorized> {
  // 1. Find existing guest by device fingerprint or create new one
  const existingGuest = await MyGlobal.prisma.erp_hrm_guests.findFirst({
    where: { device_fingerprint: props.body.deviceFingerprint },
  });
  let guestId: string & tags.Format<"uuid">;
  if (existingGuest) {
    guestId = existingGuest.id as string & tags.Format<"uuid">;
  } else {
    const now = new Date();
    const guestExpiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const newGuest = await MyGlobal.prisma.erp_hrm_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.deviceFingerprint,
        created_at: now,
        updated_at: now,
        expired_at: guestExpiredAt,
      },
    });
    guestId = newGuest.id as string & tags.Format<"uuid">;
  }
  // 2. Create session with expiration times
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.erp_hrm_guest_sessions.create({
    data: {
      id: v4(),
      guest: { connect: { id: guestId } },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 3. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 4. Return authorized response
  return {
    id: guestId,
    token,
  };
}
