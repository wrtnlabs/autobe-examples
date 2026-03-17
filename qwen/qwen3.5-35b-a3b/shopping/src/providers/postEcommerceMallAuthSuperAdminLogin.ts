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
  // 1. Find super admin by email with password_hash
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        full_name: true,
        display_name: true,
        grade: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // 2. Verify super admin exists
  if (!superAdmin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check account status and soft deletion
  if (superAdmin.status !== "active" || superAdmin.deleted_at !== null) {
    throw new HttpException("Account is not active", 401);
  }
  // 4. Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Create new session with proper expiry times
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        super_admin_id: superAdmin.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpiresDate),
      },
    });
  // 6. Generate JWT tokens
  const tokenPayload = {
    type: "superAdmin",
    id: superAdmin.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create activity log entry for login
  const activityLogId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_activity_logs.create({
    data: {
      id: activityLogId,
      actor_type: "super_admin",
      entity_type: "super_admin",
      entity_id: superAdmin.id,
      action_type: "login",
      action_description: "Super administrator logged in successfully",
      ip_address: props.ip,
      user_agent: "",
      created_at: now,
      updated_at: now,
    },
  });
  // Then create the subsidiary activity log entry
  await MyGlobal.prisma.ecommerce_mall_activity_log_of_super_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_activity_log_id: activityLogId,
      ecommerce_mall_super_admin_id: superAdmin.id,
      ecommerce_mall_super_admin_session_id: session.id,
      created_at: now,
      updated_at: now,
    },
  });
  // 8. Return IAuthorized response
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    fullName: superAdmin.full_name,
    displayName: superAdmin.display_name,
    grade: superAdmin.grade,
    status: superAdmin.status,
    createdAt: toISOStringSafe(superAdmin.created_at),
    updatedAt: toISOStringSafe(superAdmin.updated_at),
    deletedAt: superAdmin.deleted_at
      ? toISOStringSafe(superAdmin.deleted_at)
      : null,
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpiresDate),
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpiresDate),
      refreshable_until: toISOStringSafe(refreshExpiresDate),
    },
  } satisfies IEcommerceMallSuperAdmin.IAuthorized;
}
