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

export async function postShoppingMallAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Find seller by email with password_hash explicitly selected
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
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
  // 2. Validate seller exists and is not deleted
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check for deleted account (soft delete)
  if (seller.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Check if account is banned
  if (seller.banned) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Verify password using constant-time comparison
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 6. Calculate token expiration times
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 7. Create new session for this login
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      seller_id: seller.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now.toISOString(),
      expired_at: accessExpires.toISOString(),
    },
  });
  // 8. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 9. Return IAuthorized response with seller data and tokens
  return {
    shopName: seller.shop_name,
    shopDescription: seller.shop_description ?? null,
    logoImage: seller.logo_image ?? null,
    id: seller.id,
    email: seller.email,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason ?? null,
    suspended: seller.suspended,
    banned: seller.banned,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    token,
  };
}
