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
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find seller and validate account
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      shop_name: true,
      shop_description: true,
      logo_image: true,
      approval_status: true,
      rejection_reason: true,
      suspended: true,
      banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 401);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (seller.banned) {
    throw new HttpException("Account is banned", 403);
  }
  // 4. Validate session exists and is valid
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        seller_id: decoded.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Check if session has expired
  const now = new Date();
  if (now > session.expired_at) {
    throw new HttpException("Session expired", 401);
  }
  // 6. Generate new tokens (session_id remains the same for continuity)
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Return response with seller profile and new tokens
  return {
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email as string & tags.Format<"email">,
    shopName: seller.shop_name,
    shopDescription: seller.shop_description ?? null,
    logoImage: seller.logo_image ?? null,
    approval_status: seller.approval_status as
      | "pending"
      | "approved"
      | "rejected",
    rejection_reason: seller.rejection_reason ?? null,
    suspended: seller.suspended,
    banned: seller.banned,
    created_at: seller.created_at.toISOString(),
    updated_at: seller.updated_at.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
