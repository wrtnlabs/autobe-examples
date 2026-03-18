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
  // 1. Upsert guest record atomically by fingerprint unique index
  const guest = await MyGlobal.prisma.erp_hrm_guests.upsert({
    where: { fingerprint: props.body.fingerprint },
    create: {
      id: v4(),
      fingerprint: props.body.fingerprint,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    update: {
      updated_at: new Date().toISOString(),
    },
    select: { id: true, fingerprint: true, created_at: true },
  });
  // 2. Compute session expiry timestamps
  const nowMs = Date.now();
  const accessExpiresAt = new Date(nowMs + 60 * 60 * 1000).toISOString();
  const refreshExpiresAt = new Date(
    nowMs + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtIso = new Date(nowMs).toISOString();
  const clientIp = props.body.ip ?? props.ip;
  // 3. Create new guest session
  const session = await MyGlobal.prisma.erp_hrm_guest_sessions.create({
    data: {
      id: v4(),
      guest: { connect: { id: guest.id } },
      ip: clientIp,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: createdAtIso,
      expired_at: accessExpiresAt,
    },
    select: { id: true },
  });
  // 4. Generate JWT access and refresh tokens
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return IErpHrmGuest.IAuthorized
  return {
    id: guest.id,
    fingerprint: guest.fingerprint,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    } satisfies IAuthorizationToken,
    created_at: guest.created_at.toISOString(),
  } satisfies IErpHrmGuest.IAuthorized;
}
