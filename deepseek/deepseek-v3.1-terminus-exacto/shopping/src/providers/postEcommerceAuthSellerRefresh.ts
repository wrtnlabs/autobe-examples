import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function postEcommerceAuthSellerRefresh(props: {
  body: IEcommerceSeller.IRefresh;
}): Promise<IEcommerceSeller.IAuthorized> {
  // Step 1: Verify refresh token
  let decoded: {
    type?: string;
    id?: string;
    session_id?: string;
    created_at?: string;
  };
  try {
    const result = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    // Properly handle the jwt.verify return type (string | JwtPayload)
    if (typeof result === "string") {
      throw new HttpException("Invalid token format", 401);
    }
    decoded = result as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Step 2: Validate token payload
  if (
    !decoded.type ||
    !decoded.id ||
    !decoded.session_id ||
    !decoded.created_at
  ) {
    throw new HttpException("Invalid token payload", 401);
  }
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  // Step 3: Validate session exists and active
  const currentTime = toISOStringSafe(new Date());
  const session = await MyGlobal.prisma.ecommerce_seller_sessions.findFirst({
    where: {
      id: decoded.session_id,
      ecommerce_seller_id: decoded.id,
      expires_at: { gt: new Date(currentTime) },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Step 4: Validate seller account
  const seller = await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (
    seller.account_status !== "active" &&
    seller.account_status !== "approved"
  ) {
    throw new HttpException("Seller account is not active", 403);
  }
  // Step 5: Generate new tokens with same session ID
  const now = new Date();
  const accessExpiresMs = now.getTime() + 60 * 60 * 1000;
  const refreshExpiresMs = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const accessExpires = toISOStringSafe(new Date(accessExpiresMs));
  const refreshExpires = toISOStringSafe(new Date(refreshExpiresMs));
  const tokenPayload = {
    type: "seller",
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: toISOStringSafe(now),
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Step 6: Update session expiration
  await MyGlobal.prisma.ecommerce_seller_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(refreshExpiresMs),
      last_accessed_at: now,
    },
  });
  // Step 7: Return seller profile with new tokens
  return {
    id: seller.id,
    email: seller.email,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description,
    logo_image_url: seller.logo_image_url,
    account_status: seller.account_status,
    approval_reason: seller.approval_reason,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
