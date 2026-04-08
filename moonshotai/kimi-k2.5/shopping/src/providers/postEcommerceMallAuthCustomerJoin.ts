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

export async function postEcommerceMallAuthCustomerJoin(props: {
  ip: string;
  body: IEcommerceMallCustomer.IJoin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // Check email uniqueness
  const existing = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create customer
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Calculate token and session expiration
  const currentTime = Date.now();
  const accessExpiresMs = 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpires = new Date(currentTime + accessExpiresMs);
  const refreshExpires = new Date(currentTime + refreshExpiresMs);
  // Create session
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: v4(),
        ecommerce_mall_customer_id: customer.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href satisfies string as string,
        referrer: props.body.referrer satisfies string as string,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  // Generate JWT tokens
  const token: IAuthorizationToken = {
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
  };
  // Build summary for customer field
  const customerSummary: IEcommerceMallCustomer.ISummary = {};
  // Default empty values for optional profile/address fields
  return {
    id: customer.id satisfies string as string & tags.Format<"uuid">,
    recipientName: "",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    isDefault: false,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    email: customer.email,
    displayName: "",
    customer: customerSummary,
    token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
