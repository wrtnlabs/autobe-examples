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

export async function postEcommerceMallAuthAdminJoin(props: {
  ip: string;
  body: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // Find admin by email
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
    where: { email: props.body.email },
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
  // Verify password
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check account status
  if (admin.status !== "active") {
    throw new HttpException(
      `Account is ${admin.status}. Contact administrator.`,
      403,
    );
  }
  // Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: refreshExpires,
      created_at: new Date(),
    },
    select: {
      id: true,
      expired_at: true,
    },
  });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Return authorized response
  return {
    id: admin.id,
    email: admin.email,
    grade: admin.grade as "regular" | "super_admin",
    status: admin.status as "active" | "suspended" | "banned",
    nickname: admin.nickname,
    createdAt: admin.created_at.toISOString(),
    updatedAt: admin.updated_at.toISOString(),
    deletedAt: admin.deleted_at?.toISOString() ?? null,
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
