import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function postEcommerceMallAuthSellerRefresh(props: {
  body: IEcommerceMallSeller.IRefresh;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    type: "seller";
    id: string;
    session_id: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is not expired
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_mall_sellers_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const sessionExpiredAt = new Date(session.expired_at);
  const now = new Date();
  if (sessionExpiredAt <= now) {
    throw new HttpException("Session expired", 401);
  }
  // 4. Validate seller account exists and is active
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: decoded.id },
  });
  if (!seller) {
    throw new HttpException("Seller account not found", 401);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (seller.account_status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  // 5. Generate new tokens with SAME session_id (token rotation)
  const accessExpiresInMs = 15 * 60 * 1000; // 15 minutes
  const refreshExpiresInMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpires = new Date(now.getTime() + accessExpiresInMs);
  const refreshExpires = new Date(now.getTime() + refreshExpiresInMs);
  const newAccessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // 7. Return IAuthorized response
  const deletedAtValue = seller.deleted_at;
  const deletedAtResult: (string & tags.Format<"date-time">) | null =
    deletedAtValue === null
      ? null
      : (toISOStringSafe(deletedAtValue) as string & tags.Format<"date-time">);
  return {
    id: seller.id as string & tags.Format<"uuid">,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description ?? null,
    approval_status: seller.approval_status,
    account_status: seller.account_status,
    created_at: toISOStringSafe(seller.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(seller.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: deletedAtResult,
    rejection_reason: seller.rejection_reason ?? null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
    seller: {
      id: seller.id as string & tags.Format<"uuid">,
      email: seller.email as string & tags.Format<"email">,
      shop_name: seller.shop_name,
      shop_description: seller.shop_description ?? null,
      approval_status: seller.approval_status as
        | "pending"
        | "approved"
        | "rejected",
      rejection_reason: seller.rejection_reason ?? null,
      account_status: seller.account_status as
        | "active"
        | "suspended"
        | "banned",
      created_at: toISOStringSafe(seller.created_at) as string &
        tags.Format<"date-time">,
    },
  };
}
