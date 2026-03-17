import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerJoin(props: {
  ip: string;
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Check email uniqueness across sellers
  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existingSeller) {
    throw new HttpException("Email already registered as seller", 409);
  }
  // 2. Check email uniqueness across admins
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered as administrator", 409);
  }
  // 3. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Create seller record
  const sellerId = v4();
  const now = new Date();
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: passwordHash,
      shop_name: props.body.shop_name,
      shop_description: props.body.shop_description ?? null,
      logo_image_url: props.body.logo_image_url ?? null,
      approval_status: "PENDING",
      rejection_reason: null,
      suspended: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...ShoppingMallSellerTransformer.select(),
  });
  // 5. Create email verification token
  const verificationToken = v4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.shopping_mall_seller_email_verifications.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      token: verificationToken,
      expires_at: expiresAt,
      verified_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Create session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_seller_id: seller.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 7. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 8. Return IAuthorized
  return {
    ...(await ShoppingMallSellerTransformer.transform(seller)),
    token,
  } satisfies IShoppingMallSeller.IAuthorized;
}
