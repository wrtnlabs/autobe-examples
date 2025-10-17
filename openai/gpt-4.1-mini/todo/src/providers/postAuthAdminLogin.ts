import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminLogin(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.ILogin;
}): Promise<ITodoListAdmin.IAuthorized> {
  const { body } = props;

  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (admin === null) {
    throw new HttpException("Administrator not found", 404);
  }

  const isValidPassword = await PasswordUtil.verify(
    body.password,
    admin.password_hash,
  );

  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 400);
  }

  const now = Date.now();
  const accessExpiresInSeconds = 60 * 60; // 1 hour
  const refreshExpiresInSeconds = 60 * 60 * 24 * 7; // 7 days

  const accessToken = jwt.sign(
    {
      id: admin.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessExpiresInSeconds,
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: admin.id,
      type: "admin",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshExpiresInSeconds,
      issuer: "autobe",
    },
  );

  const expiredAt = toISOStringSafe(
    new Date(now + accessExpiresInSeconds * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(now + refreshExpiresInSeconds * 1000),
  );

  return {
    id: admin.id,
    email: admin.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
  };
}
