import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCustomerCollector } from "../collectors/EcommerceCustomerCollector";
import { EcommerceCustomerSessionCollector } from "../collectors/EcommerceCustomerSessionCollector";
import { EcommerceCustomerSessionTransformer } from "../transformers/EcommerceCustomerSessionTransformer";
import { EcommerceCustomerTransformer } from "../transformers/EcommerceCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthCustomerJoin(props: {
  body: IEcommerceCustomer.IJoin;
}): Promise<IEcommerceCustomer.IAuthorized> {
  // 1. Check for existing email
  const existing = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create customer (Collector handles password hashing)
  const customer = await MyGlobal.prisma.ecommerce_customers.create({
    data: await EcommerceCustomerCollector.collect({
      body: props.body,
    }),
    ...EcommerceCustomerTransformer.select(),
  });
  // 3. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_customer_sessions.create({
    data: await EcommerceCustomerSessionCollector.collect({
      body: props.body,
      ecommerceCustomer: { id: customer.id },
      ip: props.body.ip,
    }),
    ...EcommerceCustomerSessionTransformer.select(),
  });
  // 4. Generate JWT tokens
  const token = {
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
  // 5. Return IAuthorized
  return {
    ...(await EcommerceCustomerTransformer.transform(customer)),
    token,
  } satisfies IEcommerceCustomer.IAuthorized;
}
