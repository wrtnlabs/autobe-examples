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
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create seller
  const now = new Date();
  const sellerId = v4();
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: passwordHash,
      shop_name: props.body.shop_name,
      shop_description: props.body.shop_description ?? null,
      logo_image: props.body.logo_image ?? null,
      approval_status: "pending",
      suspended: false,
      banned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      shop_name: true,
      shop_description: true,
      logo_image: true,
      approval_status: true,
      rejection_reason: true,
      suspended: true,
      banned: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 4. Create session (24 hour expiry)
  const sessionId = v4();
  const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      seller_id: sellerId,
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      expired_at: expiredAt,
    },
  });
  // 5. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: sellerId,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: sellerId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return IAuthorized
  return {
    id: seller.id,
    email: seller.email,
    shopName: seller.shop_name,
    shopDescription: seller.shop_description,
    logoImage: seller.logo_image,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason,
    suspended: seller.suspended,
    banned: seller.banned,
    created_at: seller.created_at.toISOString(),
    updated_at: seller.updated_at.toISOString(),
    token,
  };
}
