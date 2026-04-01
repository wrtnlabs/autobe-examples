import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSuperAdministratorJoin(props: {
  ip: string;
  body: IShoppingMallSuperAdministrator.IJoin;
}): Promise<IShoppingMallSuperAdministrator.IAuthorized> {
  const existing =
    await MyGlobal.prisma.shopping_mall_super_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const sessionId = v4();
  const superAdmin =
    await MyGlobal.prisma.shopping_mall_super_administrators.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: passwordHash,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const accessToken = jwt.sign(
    {
      type: "superAdministrator",
      id: superAdmin.id,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "superAdministrator",
      id: superAdmin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_super_administrator_sessions.create({
    data: {
      id: sessionId,
      super_administrator_id: superAdmin.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    created_at: superAdmin.created_at.toISOString(),
    updated_at: superAdmin.updated_at.toISOString(),
    deleted_at: superAdmin.deleted_at?.toISOString() ?? null,
    token,
  };
}
