import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const email = (
    props.body as {
      email: string;
    }
  ).email;
  if (!email) throw new HttpException("Email is required", 400);
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const password = (
    props.body as {
      password: string;
    }
  ).password;
  if (!password) throw new HttpException("Password is required", 400);
  const hashedPassword = await PasswordUtil.hash(password);
  const nowISOString = toISOStringSafe(new Date());
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: v4(),
      email,
      password_hash: hashedPassword,
      created_at: nowISOString,
      updated_at: nowISOString,
    },
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      ip: "",
      expired_at: toISOStringSafe(accessExpires),
      created_at: nowISOString,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    token,
  } satisfies IShoppingMallCustomer.IAuthorized;
}
