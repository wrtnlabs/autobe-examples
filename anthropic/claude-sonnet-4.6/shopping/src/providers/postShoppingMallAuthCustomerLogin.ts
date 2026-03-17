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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerLogin(props: {
  ip: string;
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Find customer by email (active accounts only)
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      nickname: true,
      phone: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 2. Generic 401 if not found (prevent user enumeration)
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password against stored bcrypt hash
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Reject banned accounts
  if (customer.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  // 5. Prepare expiry timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 6. Generate session ID and JWT tokens
  const sessionId = v4();
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Persist new session record
  await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_customer_id: customer.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 8. Build token payload
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 9. Build customer entity object
  const customerEntity = {
    id: customer.id,
    email: customer.email,
    nickname: customer.nickname,
    phone: customer.phone ?? null,
    isBanned: customer.is_banned,
    createdAt: customer.created_at.toISOString(),
    updatedAt: customer.updated_at.toISOString(),
    deletedAt: customer.deleted_at ? customer.deleted_at.toISOString() : null,
  } satisfies IShoppingMallCustomer;
  // 10. Return full IAuthorized response
  return {
    id: customer.id,
    email: customer.email,
    nickname: customer.nickname,
    phone: customer.phone ?? null,
    isBanned: customer.is_banned,
    createdAt: customer.created_at.toISOString(),
    updatedAt: customer.updated_at.toISOString(),
    deletedAt: customer.deleted_at ? customer.deleted_at.toISOString() : null,
    customer: customerEntity,
    token,
  } satisfies IShoppingMallCustomer.IAuthorized;
}
