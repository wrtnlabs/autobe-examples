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
import { EcommerceSellerTransformer } from "../transformers/EcommerceSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthSellerLogin(props: {
  body: IEcommerceSeller.ILogin;
}): Promise<IEcommerceSeller.IAuthorized> {
  // Find seller by email with password_hash explicitly selected
  const seller = await MyGlobal.prisma.ecommerce_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null, // Ensure seller account is not deleted
    },
    select: {
      ...EcommerceSellerTransformer.select().select,
      password_hash: true,
    },
  });
  if (!seller) throw new HttpException("Invalid credentials", 401);
  // Verify password credentials
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Validate account status (must be approved or active)
  if (!["approved", "active"].includes(seller.account_status)) {
    if (seller.account_status === "pending_approval") {
      throw new HttpException("Account pending administrator approval", 403);
    } else if (seller.account_status === "rejected") {
      throw new HttpException("Account registration was rejected", 403);
    } else if (seller.account_status === "suspended") {
      throw new HttpException("Account temporarily suspended", 403);
    }
    throw new HttpException("Account status invalid", 403);
  }
  // Calculate token expiration timestamps
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Generate JWT tokens first
  const tokenPayload = {
    type: "seller",
    id: seller.id,
    session_id: v4(), // Generate session ID early for JWT payload
    created_at: now.toISOString(),
  };
  const token = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayload,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // Create new session with the generated tokens
  const session = await MyGlobal.prisma.ecommerce_seller_sessions.create({
    data: {
      id: tokenPayload.session_id,
      ecommerce_seller_id: seller.id,
      access_token: token.access,
      refresh_token: token.refresh,
      ip_address: "unknown", // Default if no connection info available
      user_agent: "unknown", // Default if no user agent available
      referrer: null,
      created_at: now,
      expires_at: accessExpires,
      last_accessed_at: now,
    },
  });
  // Transform seller data and return with authorization token
  const sellerData = await EcommerceSellerTransformer.transform(seller);
  return {
    ...sellerData,
    token,
  } satisfies IEcommerceSeller.IAuthorized;
}
