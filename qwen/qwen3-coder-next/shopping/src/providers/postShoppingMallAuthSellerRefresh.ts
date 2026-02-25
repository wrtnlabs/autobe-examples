import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
  // 1. Verify refresh token and decode
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
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is active
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        shopping_mall_seller_id: decoded.id,
        expired_at: { gt: new Date() },
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or invalid", 401);
  }
  // 4. Validate seller account exists and is not deleted
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 5. Generate new tokens with same session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 6. Create access token
  const access = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // 7. Create refresh token
  const refresh = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Log refresh event for security audit
  await MyGlobal.prisma.shopping_mall_seller_access_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      seller_id: decoded.id,
      ip: session.ip,
      referrer: session.referrer,
      user_agent: null,
      geolocation: null,
      success: true,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // 9. Update session with new refresh token expiration
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: toISOStringSafe(refreshExpires),
    },
  });
  // 10. Build response
  return {
    id: seller.id,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description ?? null,
    logo_image_url: seller.logo_image_url ?? null,
    approval_status: seller.approval_status,
    approval_date: seller.approval_date
      ? toISOStringSafe(seller.approval_date)
      : null,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    data: {
      profile: {
        id: seller.id,
        shop_name: seller.shop_name,
        approval_status: seller.approval_status,
        created_at: toISOStringSafe(seller.created_at),
      },
      token: {
        access: access,
        refresh: refresh,
        expired_at: toISOStringSafe(accessExpires),
      },
    },
    meta: {
      version: "1.0",
    },
    token: {
      access: access,
      refresh: refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
