import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function postEcommerceMallAuthAdminLogin(props: {
  ip: string;
  body: IEcommerceMallAdmin.ILogin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Find admin by email with password_hash
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      email: {
        equals: props.body.email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      grade: true,
      status: true,
      nickname: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check account status
  if (admin.status === "suspended") {
    throw new HttpException("Account suspended", 403);
  }
  if (admin.status === "banned") {
    throw new HttpException("Account banned", 403);
  }
  // 4. Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      ip: props.ip,
      href: "login",
      referrer: "",
      created_at: now.toISOString(),
      expired_at: accessExpires.toISOString(),
    },
  });
  // 5. Generate JWT tokens
  const createdAt = now.toISOString();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 6. Return authorized response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    grade: admin.grade as "regular" | "super_admin",
    status: admin.status as "active" | "suspended" | "banned",
    nickname: admin.nickname,
    created_at: admin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: admin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: admin.deleted_at
      ? (admin.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
    token,
  };
}
