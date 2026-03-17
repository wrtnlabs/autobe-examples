import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSuperAdminLogin(props: {
  ip: string;
  body: IEcommerceMallSuperAdmin.ILogin;
}): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  // Find super admin by email with password_hash for verification
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        grade: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (superAdmin === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password using secure comparison
  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (isPasswordValid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Generate session timestamps
  const now = new Date();
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Generate session ID
  const sessionId = v4();
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdmin.id,
      session_id: sessionId,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdmin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session record - using correct field names from schema
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
    data: {
      id: sessionId,
      super_admin_id: superAdmin.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  // Construct token structure
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  // Return authorized response
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    grade: superAdmin.grade,
    createdAt: toISOStringSafe(superAdmin.created_at),
    updatedAt: toISOStringSafe(superAdmin.updated_at),
    deletedAt:
      superAdmin.deleted_at === null
        ? null
        : toISOStringSafe(superAdmin.deleted_at),
    token,
  };
}
