import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerRefresh(props: {
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Look up the session by refresh_token (unique index)
  const existingSession =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst({
      where: {
        refresh_token: props.body.refresh_token,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        expired_at: true,
        ip: true,
        href: true,
        referrer: true,
      },
    });
  if (existingSession === null) {
    throw new HttpException("Refresh token not found or invalid", 401);
  }
  // 2. Check session expiry
  if (existingSession.expired_at <= new Date()) {
    throw new HttpException("Refresh token has expired", 401);
  }
  // 3. Load seller and validate account state
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: existingSession.shopping_mall_seller_id },
    select: {
      id: true,
      email: true,
      shop_name: true,
      is_banned: true,
      is_suspended: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller account has been deleted", 401);
  }
  if (seller.is_banned) {
    throw new HttpException("Seller account has been permanently banned", 403);
  }
  if (seller.is_suspended) {
    throw new HttpException("Seller account is currently suspended", 403);
  }
  // 4. Prepare new session ID and expiry timestamps
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const newSessionId = v4();
  // 5. Generate new JWT access and refresh tokens
  const newAccessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: newSessionId,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: newSessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Invalidate old session (token rotation)
  await MyGlobal.prisma.shopping_mall_seller_sessions.delete({
    where: { id: existingSession.id },
  });
  // 7. Insert new session row with fresh tokens and updated expiry
  await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: newSessionId,
      shopping_mall_seller_id: seller.id,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      ip: existingSession.ip,
      href: existingSession.href,
      referrer: existingSession.referrer ?? null,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 8. Build the seller DTO (nested and top-level fields)
  const sellerDto = {
    id: seller.id,
    email: seller.email,
    shopName: seller.shop_name,
    isBanned: seller.is_banned,
    isSuspended: seller.is_suspended,
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt: null,
  } satisfies IShoppingMallSeller;
  // 9. Return the full authorized response
  return {
    id: seller.id,
    email: seller.email,
    shopName: seller.shop_name,
    isBanned: seller.is_banned,
    isSuspended: seller.is_suspended,
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt: null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
    seller: sellerDto,
  } satisfies IShoppingMallSeller.IAuthorized;
}
