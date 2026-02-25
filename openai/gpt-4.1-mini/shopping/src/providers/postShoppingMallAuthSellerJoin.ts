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

export async function postShoppingMallAuthSellerJoin(props: {
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Check for duplicate seller email
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // Create seller record
  const now = new Date();
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      shop_name: props.body.shopName,
      shop_description: props.body.shopDescription ?? null,
      logo_uri: props.body.logoUri ?? null,
      approval_status: "pending",
      rejection_reason: null,
      created_at: now.toISOString() satisfies string & tags.Format<"date-time">,
      updated_at: now.toISOString() satisfies string & tags.Format<"date-time">,
      deleted_at: null,
    },
  });
  // Set expiration for access and refresh tokens
  const accessExpires = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  // Create session record
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_seller_id: seller.id,
      ip: null,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
      created_at: now.toISOString() satisfies string & tags.Format<"date-time">,
      updated_at: now.toISOString() satisfies string & tags.Format<"date-time">,
    },
  });
  // Generate JWT tokens
  const nowIso = now.toISOString() satisfies string & tags.Format<"date-time">;
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Return seller info with token as IAuthorized
  return {
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email,
    shopName: seller.shop_name,
    shopDescription: seller.shop_description,
    logoUri: seller.logo_uri,
    approvalStatus: seller.approval_status,
    rejectionReason: seller.rejection_reason,
    createdAt: seller.created_at,
    updatedAt: seller.updated_at,
    deletedAt: seller.deleted_at ?? null,
    token,
  };
}
