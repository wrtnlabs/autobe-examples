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
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email, deleted_at: null },
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
  if (admin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const sessionId = v4();
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: sessionId,
      admin_id: admin.id,
      ip: props.ip,
      href: (props.body as any).href ?? "",
      referrer: (props.body as any).referrer ?? "",
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(refreshExpiresAt),
    },
  });
  const tokenPayload = {
    type: "admin",
    id: admin.id,
    session_id: sessionId,
    created_at: toISOStringSafe(now),
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  return {
    id: admin.id,
    email: admin.email,
    grade: typia.assert<"regular" | "super_admin">(admin.grade),
    status: admin.status,
    nickname: admin.nickname,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpiresAt),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
  };
}
