import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postAuthCustomerLogin(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { email: props.body.email },
  });
  if (customer === null) {
    throw new HttpException("Invalid credentials", 401);
  }

  const validPassword = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!validPassword) {
    throw new HttpException("Invalid credentials", 401);
  }

  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: customer.id,
      ip: props.body.ip ?? "",
      href: props.body.href ?? "",
      referrer: props.body.referrer ?? "",
      created_at: now,
      expired_at: accessExpires,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: customer.id,
    email: customer.email,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    token,
  };
}
