import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestRefresh(props: {
  body: ICommunityPlatformGuest.IRefresh;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const { body } = props;
  // 1. Find guest by session_key or id
  const guest = await MyGlobal.prisma.community_platform_guests.findFirst({
    where: {
      ...(body.id !== undefined && body.id !== null
        ? { id: body.id }
        : { session_key: body.session_key }),
    },
  });
  if (!guest || guest.deleted_at !== null) {
    throw new HttpException("Session has expired or is invalid", 401);
  }
  // 2. Prepare payload & expiry
  const payload = {
    id: guest.id,
    type: "guest",
  };
  const nowEpoch = Math.floor(Date.now() / 1000);
  const accessExpSec = nowEpoch + 60 * 60; // access: 1 hour
  const refreshExpSec = nowEpoch + 60 * 60 * 24 * 7; // refresh: 7 days

  // 3. Generate tokens (all date-times ISO strings, no Date type)
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: 60 * 60, // 1 hour
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    issuer: "autobe",
  });
  const expired_at = toISOStringSafe(new Date(accessExpSec * 1000));
  const refreshable_until = toISOStringSafe(new Date(refreshExpSec * 1000));

  // 4. Assemble response per ICommunityPlatformGuest.IAuthorized
  return {
    id: guest.id,
    session_key: guest.session_key,
    created_at: toISOStringSafe(guest.created_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
