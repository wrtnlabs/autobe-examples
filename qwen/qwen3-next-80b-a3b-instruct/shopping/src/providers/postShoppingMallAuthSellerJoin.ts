import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";

export async function postShoppingMallAuthSellerJoin(props: {
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Check for existing seller with same email
  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique(
    {
      where: { email: props.body.email },
    },
  );
  if (existingSeller) {
    throw new HttpException("Email already registered", 409);
  }
  // Create seller record directly with required password_hash field
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      shop_name: "", // String field must have a default value
      is_approved: false,
      is_suspended: false,
    },
  });
  // Generate email verification token (UUID)
  const verificationToken = v4();
  const verificationExpiresAt = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  // Create email verification record in shopping_mall_seller_email_verifications
  await MyGlobal.prisma.shopping_mall_seller_email_verifications.create({
    data: {
      id: verificationToken,
      seller_id: seller.id,
      expired_at: verificationExpiresAt,
      created_at: toISOStringSafe(new Date()),
      token: verificationToken,
    },
  });
  // Create session record for authentication
  const sessionId = v4();
  const accessExpires = toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000)); // 30 minutes
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  // Create session record
  await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      seller_id: seller.id,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Generate JWT access and refresh tokens
  const accessToken = jwt.sign(
    {
      type: "seller" as const,
      id: seller.id,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller" as const,
      id: seller.id,
      session_id: sessionId,
      tokenType: "refresh" as const,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return IShoppingMallSeller.IAuthorized response
  return {
    shop_name: "", // String field, must provide value
    approval_status: "pending_approval",
    is_suspended: false,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    access_token: accessToken,
    refresh_token: refreshToken,
    seller_id: seller.id,
    email: seller.email,
    role: "seller",
    status: "pending_verification",
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IShoppingMallSeller.IAuthorized;
}
