import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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

export async function postEcommerceAuthSellerRefresh(props: {
  body: IEcommerceSeller.IRefresh;
}): Promise<IEcommerceSeller.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    type: "seller";
    id: string;
    session_id: string;
    created_at: string;
  };
  try {
    decoded = typia.assert<{
      type: "seller";
      id: string;
      session_id: string;
      created_at: string;
    }>(
      jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is active
  const session = await MyGlobal.prisma.ecommerce_seller_sessions.findFirst({
    where: {
      id: decoded.session_id,
      ecommerce_seller_id: decoded.id,
      deleted_at: null,
      expired_at: {
        gte: new Date(),
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate seller account exists and is not deleted
  const seller = await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Validate seller is not banned
  if (seller.is_banned) {
    throw new HttpException("Account has been banned", 403);
  }
  // 6. Validate seller is approved
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller account is not approved", 403);
  }
  // 7. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session with new tokens and extended expiration
  await MyGlobal.prisma.ecommerce_seller_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: refreshExpires,
      updated_at: new Date(),
    },
  });
  // 9. Fetch seller with profile for response
  const sellerWithProfile =
    await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
      where: { id: decoded.id },
      ...EcommerceSellerTransformer.select(),
    });
  // 10. Transform to response DTO
  const transformedSeller =
    await EcommerceSellerTransformer.transform(sellerWithProfile);
  // 11. Build response with properly typed token
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: transformedSeller.id,
    approval_status: transformedSeller.approval_status,
    rejection_reason: transformedSeller.rejection_reason,
    is_suspended: transformedSeller.is_suspended,
    is_banned: transformedSeller.is_banned,
    created_at: transformedSeller.created_at,
    updated_at: transformedSeller.updated_at,
    deleted_at: transformedSeller.deleted_at,
    profile: transformedSeller.profile,
    token,
  };
}
