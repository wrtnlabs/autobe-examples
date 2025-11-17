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

export async function postAuthCustomerJoin(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { email: props.body.email },
    });
  if (existingCustomer !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const nowISOString = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const customerId = v4();
  const sessionId = v4();

  const newCustomer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: nowISOString,
      updated_at: nowISOString,
    },
  });

  const newSession =
    await MyGlobal.prisma.shopping_mall_customer_sessions.create({
      data: {
        id: sessionId,
        shopping_mall_customer_id: customerId,
        ip: "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowISOString,
        expired_at: accessExpires,
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: newCustomer.id,
    email: newCustomer.email,
    created_at: nowISOString,
    updated_at: nowISOString,
    token,
  };
}
