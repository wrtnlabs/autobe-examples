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

export async function postShoppingMallAuthSellerRefresh(props: {
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Verify refresh token and extract payload
  let payload: {
    id: string;
    session_id: string;
    type: string;
  } | null = null;
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified === "object" && verified !== null) {
      const obj = verified as Record<string, unknown>;
      if (
        typeof obj.id === "string" &&
        typeof obj.session_id === "string" &&
        typeof obj.type === "string"
      ) {
        payload = { id: obj.id, session_id: obj.session_id, type: obj.type };
      }
    }
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!payload) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (payload.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: payload.session_id,
        shopping_mall_seller_id: payload.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session not expired
  const now = toISOStringSafe(new Date());
  const sessionExpiredAt = toISOStringSafe(session.expired_at);
  if (sessionExpiredAt <= now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate seller account
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: payload.id },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller account not approved", 403);
  }
  // 6. Generate new tokens
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: payload.id,
      session_id: payload.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: payload.id,
      session_id: payload.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: payload.session_id },
    data: {
      expired_at: new Date(refreshExpiresAt),
    },
  });
  // 8. Return authorized response
  return {
    id: seller.id,
    email: seller.email,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason ?? undefined,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at !== null ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
