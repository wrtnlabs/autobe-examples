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
import { ShoppingMallSuperAdministratorTransformer } from "../transformers/ShoppingMallSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSuperAdministratorLogin(props: {
  ip: string;
  body: IShoppingMallSuperAdministrator.ILogin;
}): Promise<IShoppingMallSuperAdministrator.IAuthorized> {
  const accounts =
    await MyGlobal.prisma.shopping_mall_super_administrators.findMany({
      where: {
        email: props.body.email,
      },
      take: 2,
      select: {
        ...ShoppingMallSuperAdministratorTransformer.select().select,
        password_hash: true,
      },
    });
  if (accounts.length !== 1) {
    throw new HttpException("Invalid credentials", 401);
  }
  const account = accounts[0];
  if (account.deleted_at !== null || account.active === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  const verified = await PasswordUtil.verify(
    props.body.password,
    account.password_hash,
  );
  if (verified === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = toISOStringSafe(new globalThis.Date());
  const accessExpiredAt = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  await MyGlobal.prisma.shopping_mall_super_administrator_sessions.create({
    data: {
      id: sessionId,
      superAdministrator: {
        connect: {
          id: account.id,
        },
      },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiredAt,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "superadministrator",
        id: account.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "superadministrator",
        id: account.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    ...(await ShoppingMallSuperAdministratorTransformer.transform(account)),
    token,
  };
}
