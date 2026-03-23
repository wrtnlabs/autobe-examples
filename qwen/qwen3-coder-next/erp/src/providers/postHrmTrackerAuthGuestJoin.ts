import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerAuthGuestJoin(props: {
  ip: string;
  body: IHrmTrackerGuest.IJoin;
}): Promise<IHrmTrackerGuest.IAuthorized> {
  const existing = await MyGlobal.prisma.hrm_tracker_guests.findFirst({
    where: { device_fingerprint: props.body.device_fingerprint },
  });
  let guest: {
    id: string & tags.Format<"uuid">;
    device_fingerprint: string;
    email: (string & tags.Format<"email">) | null;
    password_hash: string | null;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  };
  if (existing) {
    guest = {
      id: existing.id satisfies string as string,
      device_fingerprint: existing.device_fingerprint,
      email: existing.email as (string & tags.Format<"email">) | null,
      password_hash: existing.password_hash,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
    };
  } else {
    const hashedPassword = props.body.password
      ? await PasswordUtil.hash(props.body.password)
      : null;
    const now = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.hrm_tracker_guests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        device_fingerprint: props.body.device_fingerprint,
        email: props.body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
      },
    });
    guest = {
      id: created.id satisfies string as string,
      device_fingerprint: created.device_fingerprint,
      email: created.email as (string & tags.Format<"email">) | null,
      password_hash: created.password_hash,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_tracker_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      guest_id: guest.id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  const token = {
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
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    token,
  } satisfies IHrmTrackerGuest.IAuthorized;
}
