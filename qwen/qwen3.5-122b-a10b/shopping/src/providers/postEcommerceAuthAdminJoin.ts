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

export async function postEcommerceAuthAdminJoin(props: {
  ip: string;
  body: IEcommerceAdmin.IJoin;
}): Promise<IEcommerceAdmin.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create admin account
  const adminId = v4() satisfies string & tags.Format<"uuid">;
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const admin = await MyGlobal.prisma.ecommerce_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create admin request record
  const requestId = v4() satisfies string & tags.Format<"uuid">;
  await MyGlobal.prisma.ecommerce_admin_requests.create({
    data: {
      id: requestId,
      requester_type: "admin",
      reason: props.body.reason,
      status: "pending",
      created_at: now,
      updated_at: now,
    },
  });
  // 4. Create admin grade record
  const gradeId = v4() satisfies string & tags.Format<"uuid">;
  await MyGlobal.prisma.ecommerce_administrator_grades.create({
    data: {
      id: gradeId,
      ecommerce_admin_id: adminId,
      grade: "regular",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create admin session
  const sessionId = v4() satisfies string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.ecommerce_admin_sessions.create({
    data: {
      id: sessionId,
      ecommerce_admin_id: adminId,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: toISOStringSafe(accessExpires),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Return IAuthorized
  return {
    id: adminId,
    email: admin.email,
    grade: {
      id: gradeId,
      grade: "regular",
      admin: {
        id: adminId,
        email: admin.email,
        grade: "regular",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      created_at: now,
      updated_at: now,
    } satisfies IEcommerceAdministratorGrade.ISummary,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token,
  } satisfies IEcommerceAdmin.IAuthorized;
}
