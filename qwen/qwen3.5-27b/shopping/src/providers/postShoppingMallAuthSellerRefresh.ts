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
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "seller";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as any;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find session with refresh token
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        refresh_token: props.body.refresh_token,
        revoked_at: null,
        expired_at: {
          gt: new Date(),
        },
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate session belongs to seller
  if (session.shopping_mall_seller_id !== decoded.id) {
    throw new HttpException("Invalid session", 401);
  }
  // 5. Validate seller exists and is active
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (seller.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Account is not approved", 403);
  }
  // 6. Revoke old refresh token
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: session.id },
    data: {
      revoked_at: new Date(),
    },
  });
  // 7. Generate new tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Create new session record
  const newSessionId = v4();
  await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: newSessionId,
      shopping_mall_seller_id: decoded.id,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: new Date(),
      expired_at: refreshExpires,
      revoked_at: null,
    },
  });
  // 9. Return authorization response
  return {
    id: seller.id,
    email: seller.email,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description,
    logo_image: seller.logo_image,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason,
    status: seller.status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
