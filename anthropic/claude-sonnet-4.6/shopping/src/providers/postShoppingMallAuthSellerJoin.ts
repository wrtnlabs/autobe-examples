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

export async function postShoppingMallAuthSellerJoin(props: {
  ip: string;
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Check email uniqueness across all sellers (including soft-deleted,
  //    since the DB has a unique index on email without a deleted_at filter)
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: {
        equals: props.body.email,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);
  // 3. Create seller record
  const now = new Date();
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash,
      shop_name: props.body.shop_name,
      is_banned: false,
      is_suspended: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
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
  // 4. Compute token expiration timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 5. Pre-assign session ID so it can be embedded in both JWT tokens
  const sessionId = v4();
  // 6. Generate JWT access and refresh tokens
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Persist session record
  await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      seller: { connect: { id: seller.id } },
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 8. Compose authorization token DTO
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 9. Compose seller DTO (reused for both top-level fields and nested seller)
  const sellerDto = {
    id: seller.id,
    email: seller.email,
    shopName: seller.shop_name,
    isBanned: seller.is_banned,
    isSuspended: seller.is_suspended,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt:
      seller.deleted_at !== null ? seller.deleted_at.toISOString() : null,
  } satisfies IShoppingMallSeller;
  // 10. Return IAuthorized (top-level seller fields + token + nested seller)
  return {
    id: sellerDto.id,
    email: sellerDto.email,
    shopName: sellerDto.shopName,
    isBanned: sellerDto.isBanned,
    isSuspended: sellerDto.isSuspended,
    createdAt: sellerDto.createdAt,
    updatedAt: sellerDto.updatedAt,
    deletedAt: sellerDto.deletedAt,
    token,
    seller: sellerDto,
  } satisfies IShoppingMallSeller.IAuthorized;
}
