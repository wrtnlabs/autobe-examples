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

export async function postAuthGuestJoin(props: {
  body: ICommunityPlatformGuest.ICreate;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const { session_key } = props.body;

  // Check for duplicate session_key (unique constraint)
  const existing = await MyGlobal.prisma.community_platform_guests.findUnique({
    where: { session_key },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Session key already exists", 409);
  }

  // Prepare values
  const id = v4();
  const now = toISOStringSafe(new Date()); // string & tags.Format<'date-time'>

  // Create guest entity
  const created = await MyGlobal.prisma.community_platform_guests.create({
    data: {
      id,
      session_key,
      created_at: now,
      // deleted_at omitted (defaults to null)
    },
    select: {
      id: true,
      session_key: true,
      created_at: true,
      deleted_at: true,
    },
  });

  // Token expires: access 1h, refresh 7d
  const access_expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refresh_expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Issue JWT tokens using GuestPayload (id, type: 'guest')
  const access = jwt.sign(
    {
      id: created.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      id: created.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    session_key: created.session_key,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? null
        : toISOStringSafe(created.deleted_at),
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(access_expiry),
      refreshable_until: toISOStringSafe(refresh_expiry),
    },
  };
}
