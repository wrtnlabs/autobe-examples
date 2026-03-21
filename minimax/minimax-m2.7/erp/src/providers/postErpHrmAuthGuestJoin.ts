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
  // 1. Check if guest already exists for this device_id with valid session
  const existingGuest = await MyGlobal.prisma.erp_hrm_guests.findFirst({
    where: {
      device_identifier: props.body.deviceId,
      deleted_at: null,
    },
    select: {
      id: true,
      device_identifier: true,
      created_at: true,
      updated_at: true,
      sessions: {
        where: {
          expired_at: {
            gt: new Date(),
          },
        },
        orderBy: {
          created_at: "desc",
        },
        take: 1,
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
        },
      },
    },
  });
  let guestId: string;
  let deviceIdentifier: string;
  let createdAt: Date;
  let updatedAt: Date;
  let sessionId: string;
  let sessionIp: string;
  let sessionHref: string;
  let sessionReferrer: string;
  let sessionCreatedAt: Date;
  let sessionExpiredAt: Date;
  if (existingGuest && existingGuest.sessions.length > 0) {
    // Return existing valid session
    const existingSession = existingGuest.sessions[0];
    guestId = existingGuest.id;
    deviceIdentifier = existingGuest.device_identifier;
    createdAt = existingGuest.created_at;
    updatedAt = existingGuest.updated_at;
    sessionId = existingSession.id;
    sessionIp = existingSession.ip;
    sessionHref = existingSession.href;
    sessionReferrer = existingSession.referrer;
    sessionCreatedAt = existingSession.created_at;
    sessionExpiredAt = existingSession.expired_at;
  } else {
    // Create new guest record
    const now = new Date();
    const newGuestId = v4() as string & tags.Format<"uuid">;
    const newGuest = await MyGlobal.prisma.erp_hrm_guests.create({
      data: {
        id: newGuestId,
        device_identifier: props.body.deviceId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        device_identifier: true,
        created_at: true,
        updated_at: true,
      },
    });
    // Create new session
    const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const newSessionId = v4() as string & tags.Format<"uuid">;
    const newSession = await MyGlobal.prisma.erp_hrm_guest_sessions.create({
      data: {
        id: newSessionId,
        erp_hrm_guest_id: newGuest.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: refreshExpires,
      },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
    guestId = newGuest.id;
    deviceIdentifier = newGuest.device_identifier;
    createdAt = newGuest.created_at;
    updatedAt = newGuest.updated_at;
    sessionId = newSession.id;
    sessionIp = newSession.ip;
    sessionHref = newSession.href;
    sessionReferrer = newSession.referrer;
    sessionCreatedAt = newSession.created_at;
    sessionExpiredAt = newSession.expired_at;
  }
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString() as string & tags.Format<"date-time">,
  };
  // Return IAuthorized response
  return {
    id: guestId,
    device_identifier: deviceIdentifier,
    created_at: createdAt.toISOString() as string & tags.Format<"date-time">,
    updated_at: updatedAt.toISOString() as string & tags.Format<"date-time">,
    deleted_at: null,
    token: token,
  };
}
