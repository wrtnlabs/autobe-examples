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

export async function postHrmsAuthGuestRefresh(props: {
  body: IHrmsGuest.IRefresh;
}): Promise<IHrmsGuest.IAuthorized> {
  let decoded: {
    type: "guest";
    id: string;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as {
      type: "guest";
      id: string;
      session_id: string;
      created_at: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  const nowIso = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const session = await MyGlobal.prisma.hrms_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      hrms_guest_id: decoded.id,
      expired_at: {
        gt: new Date(nowIso),
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest = await MyGlobal.prisma.hrms_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrms_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpiresIso),
      ip: props.body.href,
      href: props.body.href,
      referrer: props.body.referrer,
    },
  });
  const response: IHrmsGuest.IAuthorized = {
    id: guest.id as string & tags.Format<"uuid">,
    device_fingerprint: guest.device_fingerprint,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent,
    created_at: toISOStringSafe(guest.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(guest.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: guest.deleted_at
      ? (toISOStringSafe(guest.deleted_at) as string & tags.Format<"date-time">)
      : undefined,
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso as string & tags.Format<"date-time">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso as string & tags.Format<"date-time">,
      refreshable_until: refreshExpiresIso as string & tags.Format<"date-time">,
    },
  };
  return response;
}
