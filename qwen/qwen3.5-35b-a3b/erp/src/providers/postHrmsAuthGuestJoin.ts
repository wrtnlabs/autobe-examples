import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsAuthGuestJoin(props: {
  ip: string;
  body: IHrmsGuest.IJoin;
}): Promise<IHrmsGuest.IAuthorized> {
  const emailHash = Buffer.from(props.body.email).toString("base64");
  const existing = await MyGlobal.prisma.hrms_guests.findFirst({
    where: { device_fingerprint: emailHash },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const nowString: string & tags.Format<"date-time"> = new Date().toISOString();
  const id: string & tags.Format<"uuid"> = v4();
  const guest = await MyGlobal.prisma.hrms_guests.create({
    data: {
      id,
      device_fingerprint: emailHash,
      ip_address: props.body.ip ?? null,
      user_agent: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.hrms_guest_sessions.create({
    data: {
      id: sessionId,
      hrms_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  const tokenPayload = {
    type: "guest" as const,
    id: guest.id,
    session_id: sessionId,
    created_at: nowString,
  };
  const access: string = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshPayload = {
    ...tokenPayload,
    tokenType: "refresh" as const,
  };
  const refresh: string = jwt.sign(
    refreshPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const expiredAt: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshableUntil: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  const authorizationToken: IAuthorizationToken = {
    access,
    refresh,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  const result: IHrmsGuest.IAuthorized = {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    ip_address: guest.ip_address ?? null,
    user_agent: guest.user_agent ?? null,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    access,
    refresh,
    expired_at: expiredAt,
    token: authorizationToken,
  };
  return result;
}
