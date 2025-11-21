import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthSellerJoin(props: {
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Parse the string body as JSON to extract properties
  const bodyData = JSON.parse(props.body) as {
    email: string;
    password: string;
    business_name: string;
    business_address: string;
    tax_id: string;
    ip?: string;
    href?: string;
    referrer?: string;
  };

  // Validate email uniqueness
  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: bodyData.email },
  });

  if (existingSeller) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password using PasswordUtil (mandatory)
  const hashedPassword = await PasswordUtil.hash(bodyData.password);

  // Create seller record with 'pending_verification' status as per schema
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: bodyData.email,
      password_hash: hashedPassword,
      business_name: bodyData.business_name,
      business_address: bodyData.business_address,
      tax_id: bodyData.tax_id,
      status: "pending_verification",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Create seller session with access and refresh expiration
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      ip: bodyData.ip ? bodyData.ip : "", // Use empty string if undefined, since field is required string
      href: bodyData.href ? bodyData.href : "", // Use empty string if undefined, since field is required string
      referrer: bodyData.referrer ? bodyData.referrer : "", // Use empty string if undefined, since field is required string
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens with EXACT payload structure
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return IAuthorized interface with exact shape
  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    business_address: seller.business_address,
    tax_id: seller.tax_id,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    status: seller.status as
      | "pending_verification"
      | "active"
      | "suspended"
      | "deleted",
    deleted_at: seller.deleted_at
      ? toISOStringSafe(seller.deleted_at)
      : toISOStringSafe(seller.created_at), // Always return a string, using created_at as fallback
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
