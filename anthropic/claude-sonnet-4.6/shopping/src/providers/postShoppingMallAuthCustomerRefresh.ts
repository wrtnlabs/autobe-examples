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

export async function postShoppingMallAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Find session by refresh token (unique index)
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { refresh_token: props.body.refresh_token },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        expired_at: true,
      },
    });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Check session not expired
  if (session.expired_at <= new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 3. Load customer
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: session.shopping_mall_customer_id },
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
  // 4. Check customer not deleted
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  // 5. Check customer not banned
  if (customer.is_banned) {
    throw new HttpException("Account has been banned", 403);
  }
  // 6. Generate new tokens
  const now = Date.now();
  const accessExpiresAt = new Date(now + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days
  const newAccessToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: session.id,
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update the session with new tokens and extended expiry
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpiresAt,
    },
  });
  // 8. Build and return IShoppingMallCustomer.IAuthorized
  // After step 4, customer.deleted_at is narrowed to null, so pass null directly
  const customerDto = {
    id: customer.id,
    email: customer.email,
    nickname: customer.nickname,
    phone: customer.phone,
    isBanned: customer.is_banned,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    deletedAt: null,
  } satisfies IShoppingMallCustomer;
  return {
    id: customer.id,
    email: customer.email,
    nickname: customer.nickname,
    phone: customer.phone,
    isBanned: customer.is_banned,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    deletedAt: null,
    customer: customerDto,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    } satisfies IAuthorizationToken,
  } satisfies IShoppingMallCustomer.IAuthorized;
}
