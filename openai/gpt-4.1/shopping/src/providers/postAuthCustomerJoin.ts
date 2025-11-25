import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // Step 1: Validate unique email
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Step 2: Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Generate IDs and timestamps
  const now = toISOStringSafe(new Date());
  const customerId = v4();
  const sessionId = v4();
  // 1h access token expiry, 7d refresh window
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Step 3 & 4: Transactional creation
  const [customer, session] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_customers.create({
      data: {
        id: customerId,
        email: props.body.email,
        password_hash: hashedPassword,
        name: props.body.name,
        phone: props.body.phone,
        is_email_verified: false,
        created_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.shopping_mall_customer_sessions.create({
      data: {
        id: sessionId,
        shopping_mall_customer_id: customerId,
        ip: "", // Not provided, empty string
        href: "", // Not provided, empty string
        referrer: "", // Not provided, empty string
        created_at: now,
        expired_at: accessExpires,
      },
    }),
  ]);

  // Step 5: JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
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
        type: "customer",
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // Step 6: Response
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    is_email_verified: customer.is_email_verified,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    token,
  };
}
