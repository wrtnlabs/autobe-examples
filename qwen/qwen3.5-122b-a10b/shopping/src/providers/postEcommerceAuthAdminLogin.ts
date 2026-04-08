import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
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

export async function postEcommerceAuthAdminLogin(props: {
  ip: string;
  body: IEcommerceAdmin.ILogin;
}): Promise<IEcommerceAdmin.IAuthorized> {
  // 1. Find admin by email with password_hash
  const admin = await MyGlobal.prisma.ecommerce_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      administratorGrade: {
        select: {
          id: true,
          grade: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          ecommerceAdmin: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  // 2. Check admin exists and is not soft-deleted
  if (!admin || admin.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Check admin has an active grade assignment
  if (
    !admin.administratorGrade ||
    admin.administratorGrade.deleted_at !== null
  ) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Create new session
  const now = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_admin_sessions.create({
    data: {
      id: v4(),
      ecommerce_admin_id: admin.id,
      ip: props.ip,
      href: null,
      referrer: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Build grade summary
  const gradeSummary: IEcommerceAdministratorGrade.ISummary = {
    id: admin.administratorGrade.id,
    grade: typia.assert<"regular" | "super">(admin.administratorGrade.grade),
    admin: {
      id: admin.id,
      email: admin.email,
      grade: typia.assert<"regular" | "super">(admin.administratorGrade.grade),
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    },
    created_at: toISOStringSafe(admin.administratorGrade.created_at),
    updated_at: toISOStringSafe(admin.administratorGrade.updated_at),
  };
  // 8. Return IAuthorized
  const result: IEcommerceAdmin.IAuthorized = {
    id: admin.id,
    email: admin.email,
    grade: gradeSummary,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: token,
  };
  return result;
}
