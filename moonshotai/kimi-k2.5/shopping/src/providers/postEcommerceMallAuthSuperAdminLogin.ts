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
  // Find super admin with password_hash explicitly selected
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        password_hash: true,
        grade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (superAdmin === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Generate session expiration times
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Create new session
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        super_admin_id: superAdmin.id as string & tags.Format<"uuid">,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "superadmin",
        id: superAdmin.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadmin",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // Return authorized response
  return {
    id: superAdmin.id as string & tags.Format<"uuid">,
    email: superAdmin.email,
    grade: superAdmin.grade,
    createdAt: superAdmin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updatedAt: superAdmin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deletedAt:
      (superAdmin.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null) ?? null,
    token,
  } satisfies IEcommerceMallSuperAdmin.IAuthorized;
}
