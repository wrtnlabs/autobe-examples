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

export async function postShoppingMallAuthSuperAdminLogin(props: {
  ip: string;
  body: IShoppingMallSuperAdmin.ILogin;
}): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  const superAdmin = await MyGlobal.prisma.shopping_mall_super_admins.findFirst(
    {
      where: { email: props.body.email },
      select: {
        ...ShoppingMallSuperAdminTransformer.select().select,
        password_hash: true,
      },
    },
  );
  if (!superAdmin) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account is deleted", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.shopping_mall_super_admin_sessions.create({
      data: {
        id: v4(),
        shopping_mall_super_admin_id: superAdmin.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "superadmin",
        id: superAdmin.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
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
