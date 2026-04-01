import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeAuthGuestRefresh(props: {
  body: IErpHrmTimeGuest.IRefresh;
}): Promise<IErpHrmTimeGuest.IAuthorized> {
  const session = await MyGlobal.prisma.erp_hrm_time_guest_sessions.findFirst({
    where: {
      deleted_at: null,
    },
    orderBy: {
      updated_at: "desc",
    },
    select: {
      id: true,
      erp_hrm_time_guest_id: true,
      deleted_at: true,
      guest: {
        select: {
          id: true,
          deleted_at: true,
        },
      },
    },
  });
  if (session === null || session.guest.deleted_at !== null) {
    throw new HttpException("Unauthorized", 401);
  }
  const nowTimestamp = Date.now();
  const accessExpiredAt = new Date(nowTimestamp + 60 * 60 * 1000).toISOString();
  const refreshableUntil = new Date(
    nowTimestamp + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const issuedAt = new Date(nowTimestamp).toISOString();
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: session.erp_hrm_time_guest_id,
      session_id: session.id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: session.erp_hrm_time_guest_id,
      session_id: session.id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.erp_hrm_time_guest_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      updated_at: new Date(nowTimestamp),
    },
  });
  return {
    id: session.erp_hrm_time_guest_id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
