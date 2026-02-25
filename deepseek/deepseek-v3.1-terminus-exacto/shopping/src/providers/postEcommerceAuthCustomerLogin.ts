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
import { EcommerceCustomerTransformer } from "../transformers/EcommerceCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthCustomerLogin(props: {
  body: IEcommerceCustomer.ILogin;
}): Promise<IEcommerceCustomer.IAuthorized> {
  // 1. Find customer by email with password_hash explicitly selected
  const customer = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null, // Only active accounts
    },
    select: {
      ...EcommerceCustomerTransformer.select().select,
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
  // 3. Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.ecommerce_customer_sessions.create({
    data: {
      id: v4(),
      ecommerce_customer_id: customer.id,
      ip: "", // Framework will provide actual IP
      href: "", // Framework will provide actual URL
      referrer: "", // Framework will provide actual referrer
      created_at: new Date().toISOString(),
      expired_at: accessExpires.toISOString(),
    },
  });
  // 4. Generate JWT tokens
  const tokenPayload = {
    type: "customer",
    id: customer.id,
    session_id: session.id,
    created_at: new Date().toISOString(),
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      { ...tokenPayload, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Return customer data with tokens
  const customerData = await EcommerceCustomerTransformer.transform(customer);
  return {
    ...customerData,
    token,
  } satisfies IEcommerceCustomer.IAuthorized;
}
