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
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerLogin(props: {
  ip: string;
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Find customer by email with password_hash
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...ShoppingMallCustomerTransformer.select().select,
      password_hash: true,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check account status
  if (customer.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  // 4. Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return IAuthorized
  return {
    ...(await ShoppingMallCustomerTransformer.transform(customer)),
    token,
  } satisfies IShoppingMallCustomer.IAuthorized;
}
