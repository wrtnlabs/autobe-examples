import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSuperAdminTransformer } from "../transformers/ShoppingMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSuperAdminJoin(props: {
  ip: string;
  body: IShoppingMallSuperAdmin.IJoin;
}): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_super_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const superAdmin = await MyGlobal.prisma.shopping_mall_super_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...ShoppingMallSuperAdminTransformer.select(),
  });
  const session =
    await MyGlobal.prisma.shopping_mall_super_admin_sessions.create({
      data: {
        id: v4(),
        shopping_mall_super_admin_id: superAdmin.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
      select: {
        id: true,
      },
    });
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
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    ...(await ShoppingMallSuperAdminTransformer.transform(superAdmin)),
    token,
  } satisfies IShoppingMallSuperAdmin.IAuthorized;
}
