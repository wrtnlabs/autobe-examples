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
  ip: string;
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Find seller by email with password_hash for verification
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
  if (seller === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (isValid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check if banned
  if (seller.banned === true) {
    throw new HttpException("Account has been banned", 401);
  }
  // Calculate expiration times
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // Create new session
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      seller_id: seller.id,
      ip: props.body.ip !== undefined ? props.body.ip : props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: sessionExpires,
    },
  });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Build response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: seller.id,
    email: seller.email,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description,
    logo_image: seller.logo_image,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason,
    suspended: seller.suspended,
    banned: seller.banned,
    created_at: seller.created_at.toISOString(),
    updated_at: seller.updated_at.toISOString(),
    deleted_at:
      seller.deleted_at !== null ? seller.deleted_at.toISOString() : null,
    token,
  };
}
