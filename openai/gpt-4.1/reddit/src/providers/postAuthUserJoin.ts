import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ICommunityPlatformUser.IJoin;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  // 1. Check for existing user by email (even if soft-deleted)
  const existing = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      email: props.body.email,
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);

  // 3. Prepare values
  const now = toISOStringSafe(new Date());
  const user_id = v4();

  // 4. Create user
  const user = await MyGlobal.prisma.community_platform_users.create({
    data: {
      id: user_id,
      email: props.body.email,
      password_hash,
      status: "pending",
      business_status: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Create session
  const session_id = v4();
  const access_expired = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refresh_expired = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.community_platform_user_sessions.create(
    {
      data: {
        id: session_id,
        community_platform_user_id: user.id,
        ip: "",
        href: "",
        referrer: "",
        created_at: now,
        expired_at: access_expired,
      },
    },
  );

  // 6. JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: access_expired,
    refreshable_until: refresh_expired,
  };

  return {
    id: user.id,
    email: user.email,
    status: user.status,
    business_status: user.business_status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    token,
  };
}
