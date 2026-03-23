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
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerJoin(props: {
  ip: string;
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create seller record with hashed password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      shop_name: props.body.shop_name,
      shop_description: props.body.shop_description ?? null,
      logo_image: null,
      approval_status: "pending",
      rejection_reason: null,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...ShoppingMallSellerTransformer.select(),
  });
  // 3. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: v4(),
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: v4(),
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 4. Create session record with tokens
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
      revoked_at: null,
    },
  });
  // 5. Update tokens with actual session_id
  const finalAccessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const finalRefreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: session.id },
    data: {
      access_token: finalAccessToken,
      refresh_token: finalRefreshToken,
    },
  });
  // 6. Transform and return IAuthorized
  const token = {
    access: finalAccessToken,
    refresh: finalRefreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    ...(await ShoppingMallSellerTransformer.transform(seller)),
    token,
  } satisfies IShoppingMallSeller.IAuthorized;
}
