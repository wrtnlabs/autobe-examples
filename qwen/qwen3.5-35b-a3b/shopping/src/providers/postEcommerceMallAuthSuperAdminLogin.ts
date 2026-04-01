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
  const { email, password } = props.body;
  const admin = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      full_name: true,
      display_name: true,
      grade: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (admin.status !== "active") {
    throw new HttpException("Account is not active", 401);
  }
  const isValid = await PasswordUtil.verify(password, admin.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        super_admin_id: admin.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
      },
    });
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.updateMany({
    where: {
      super_admin_id: admin.id,
      deleted_at: null,
      id: { not: session.id },
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  const activityLog = await MyGlobal.prisma.ecommerce_mall_activity_logs.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "super_admin",
        entity_type: "super_admin",
        entity_id: admin.id,
        action_type: "login",
        action_description: `Super administrator ${admin.display_name || admin.email} logged in from ${props.ip}`,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  await MyGlobal.prisma.ecommerce_mall_activity_log_of_super_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_activity_log_id: activityLog.id,
      ecommerce_mall_super_admin_id: admin.id,
      ecommerce_mall_super_admin_session_id: session.id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "super_admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "super_admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
    refreshable_until: toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ),
  } satisfies IAuthorizationToken;
  const result: IEcommerceMallSuperAdmin.IAuthorized = {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email,
    fullName: admin.full_name,
    displayName: admin.display_name,
    grade: admin.grade,
    status: admin.status,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    access: token.access,
    refresh: token.refresh,
    expired_at: token.expired_at,
    token: token,
  };
  return result;
}
