import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: ICommunityPlatformAdmin.ICreate;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const { email, password, superuser } = props.body;

  // Check for duplicate email
  const existing = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: { email },
  });
  if (existing) {
    throw new HttpException("Admin with that email already exists", 409);
  }

  // Hash password
  const passwordHash = await PasswordUtil.hash(password);
  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.community_platform_admins.create({
    data: {
      id: id,
      email: email,
      password_hash: passwordHash,
      superuser: superuser ?? false,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Token expiries as ISO string (never use Date type outside conversion)
  const accessTokenExpiry = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshTokenExpiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // JWT tokens
  const accessToken = jwt.sign(
    { id: created.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    { id: created.id, type: "admin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    email: created.email,
    superuser: created.superuser,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshTokenExpiry,
    },
  };
}
