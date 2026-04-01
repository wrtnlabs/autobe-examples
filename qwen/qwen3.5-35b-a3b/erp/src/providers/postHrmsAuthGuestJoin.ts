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
  const guestEmail: string & tags.Format<"email"> = props.body.email;
  const existingGuest = await MyGlobal.prisma.hrms_guests.findFirst({
    where: { ip_address: props.body.ip },
  });
  if (existingGuest !== undefined) {
    throw new HttpException("Guest already exists", 409);
  }
  const deviceFingerprint: string = `${props.body.ip}-${Date.now()}`;
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updatedAt: string & tags.Format<"date-time"> = createdAt;
  const guestId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const guest = await MyGlobal.prisma.hrms_guests.create({
    data: {
      id: guestId,
      device_fingerprint: deviceFingerprint,
      ip_address: props.body.ip ?? null,
      user_agent: null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
    },
  });
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  await MyGlobal.prisma.hrms_guest_sessions.create({
    data: {
      id: sessionId,
      hrms_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: createdAt,
      expired_at: accessExpires,
    },
  });
  const accessPayload: {
    type: string;
    id: string;
    session_id: string;
    created_at: string & tags.Format<"date-time">;
  } = {
    type: "guest",
    id: guest.id,
    session_id: sessionId,
    created_at: createdAt,
  };
  const refreshPayload: {
    type: string;
    id: string;
    session_id: string;
    tokenType: string;
    created_at: string & tags.Format<"date-time">;
  } = {
    type: "guest",
    id: guest.id,
    session_id: sessionId,
    tokenType: "refresh",
    created_at: createdAt,
  };
  const access: string = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh: string = jwt.sign(
    refreshPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const token: IAuthorizationToken = {
    access: access,
    refresh: refresh,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    ip_address: guest.ip_address ?? null,
    user_agent: guest.user_agent ?? null,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    access: access,
    refresh: refresh,
    expired_at: token.expired_at,
    token: token,
  } satisfies IHrmsGuest.IAuthorized;
}
