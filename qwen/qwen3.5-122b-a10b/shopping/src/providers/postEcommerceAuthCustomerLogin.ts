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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthCustomerLogin(props: {
  ip: string;
  body: IEcommerceCustomer.ILogin;
}): Promise<IEcommerceCustomer.IAuthorized> {
  // 1. Find customer by email with password_hash
  const customer = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 2. Check if customer exists
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check if customer is not soft-deleted
  if (customer.deleted_at !== null) {
    throw new HttpException("Account deleted", 403);
  }
  // 4. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Generate UUID and timestamps
  const sessionId = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  // 6. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: sessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create new session with JWT tokens
  await MyGlobal.prisma.ecommerce_customer_sessions.create({
    data: {
      id: sessionId,
      ecommerce_customer_id: customer.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      created_at: createdAt,
      expired_at: accessExpires,
    },
  });
  // 8. Return IAuthorized
  const result: IEcommerceCustomer.IAuthorized = {
    id: customer.id,
    display_name: customer.display_name,
    phone_number: customer.phone_number,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
  return result;
}
