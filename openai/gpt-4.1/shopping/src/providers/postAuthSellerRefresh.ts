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

export async function postAuthSellerRefresh(props: {
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Step 1: Decode and verify JWT refresh token
  let decoded: { id: string; session_id: string; type: string };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: string };
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "seller") {
    throw new HttpException("Invalid actor type for this endpoint", 403);
  }

  // Step 2: Validate session
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        shopping_mall_seller_id: decoded.id,
      },
    },
  );

  if (!session) {
    throw new HttpException("Session does not exist or has been revoked", 401);
  }

  if (session.expired_at !== null) {
    const now = Date.now();
    if (new Date(session.expired_at).getTime() < now) {
      throw new HttpException("Session has expired", 401);
    }
  }

  // Step 3: Fetch the seller
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: session.shopping_mall_seller_id },
  });

  if (!seller) {
    throw new HttpException("Seller account not found", 403);
  }

  // Step 4: Generate new tokens
  const nowString = toISOStringSafe(new Date());
  const accessExpiry = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const access_token = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh_token = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const expired_at = toISOStringSafe(accessExpiry);
  const refreshable_until = toISOStringSafe(refreshExpiry);

  // Step 5: Update session expiration
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpiry },
  });

  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    registration_number: seller.registration_number,
    business_phone: seller.business_phone,
    is_email_verified: seller.is_email_verified,
    status: seller.status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at,
      refreshable_until,
    },
    seller: {
      id: seller.id,
      business_name: seller.business_name,
    },
  };
}
