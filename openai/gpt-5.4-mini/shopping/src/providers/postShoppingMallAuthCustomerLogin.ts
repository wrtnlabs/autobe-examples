import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerLogin(props: {
  ip: string;
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
      email: true,
      account_status: true,
      banned_at: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
      password_hash: true,
    },
  });
  if (!customer) throw new HttpException("Invalid credentials", 401);
  if (customer.account_status !== "active")
    throw new HttpException("Invalid credentials", 401);
  if (customer.banned_at !== null)
    throw new HttpException("Invalid credentials", 401);
  if (customer.deleted_at !== null)
    throw new HttpException("Invalid credentials", 401);
  const verified = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!verified) throw new HttpException("Invalid credentials", 401);
  const issuedAt = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: issuedAt,
      expired_at: accessExpiresAt,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "1h",
      },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: issuedAt,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "7d",
      },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  } satisfies IAuthorizationToken;
  throw new HttpException("Invalid credentials", 401);
}
