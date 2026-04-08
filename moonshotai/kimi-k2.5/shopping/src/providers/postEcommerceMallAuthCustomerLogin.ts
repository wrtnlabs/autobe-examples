import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerLogin(props: {
  ip: string;
  body: IEcommerceMallCustomer.ILogin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Find customer by email with password_hash
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
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
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: v4(),
        ecommerce_mall_customer_id: customer.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    },
  );
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
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
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;
  // Get order count for summary
  const orderCount = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: { customer_id: customer.id },
  });
  const customerSummary = {
    id: customer.id,
    email: customer.email,
    displayName: "",
    createdAt: toISOStringSafe(customer.created_at),
    deletedAt: null,
    orderCount,
  } satisfies IEcommerceMallCustomer.ISummary;
  // 5. Return IAuthorized response
  return {
    id: customer.id,
    email: customer.email,
    displayName: "",
    phoneNumber: "",
    recipientName: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    isDefault: false,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    customer: customerSummary,
    token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
