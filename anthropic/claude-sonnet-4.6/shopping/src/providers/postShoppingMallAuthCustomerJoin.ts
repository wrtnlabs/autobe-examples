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

export async function postShoppingMallAuthCustomerJoin(props: {
  ip: string;
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Check for duplicate active email
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create customer record
  const customerId = v4();
  const now = new Date();
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: passwordHash,
      nickname: props.body.nickname,
      phone: props.body.phone ?? null,
      is_banned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      phone: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 4. Pre-generate session UUID so it can be embedded in JWT payload
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const tokenCreatedAt = now.toISOString();
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: sessionId,
      created_at: tokenCreatedAt,
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
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // 5. Create session record
  await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_customer_id: customer.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 6. Build and return IShoppingMallCustomer.IAuthorized
  const customerDto = {
    id: customer.id,
    email: customer.email,
    nickname: customer.nickname,
    phone: customer.phone ?? null,
    isBanned: customer.is_banned,
    createdAt: customer.created_at.toISOString(),
    updatedAt: customer.updated_at.toISOString(),
    deletedAt: customer.deleted_at?.toISOString() ?? null,
  } satisfies IShoppingMallCustomer;
  return {
    ...customerDto,
    customer: customerDto,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies IShoppingMallCustomer.IAuthorized;
}
