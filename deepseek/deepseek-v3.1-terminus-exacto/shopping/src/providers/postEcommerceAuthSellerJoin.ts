import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function postEcommerceAuthSellerJoin(props: {
  body: IEcommerceSeller.IJoin;
}): Promise<IEcommerceSeller.IAuthorized> {
  // Check for existing seller with same email
  const existing = await MyGlobal.prisma.ecommerce_sellers.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // Create seller (collector handles password hashing)
  const seller = await MyGlobal.prisma.ecommerce_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      shop_name: props.body.shop_name,
      shop_description: props.body.shop_description ?? null,
      logo_image_url: props.body.logo_image_url ?? null,
      account_status: "pending_approval",
      approval_reason: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  // Create session with JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_seller_sessions.create({
    data: {
      id: v4(),
      ecommerce_seller_id: seller.id,
      access_token: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: v4(),
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh_token: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: v4(),
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      ip_address: props.body.ip ?? "",
      user_agent: "",
      referrer: props.body.referrer ?? null,
      created_at: toISOStringSafe(new Date()),
      expires_at: toISOStringSafe(accessExpires),
      last_accessed_at: toISOStringSafe(new Date()),
    },
  });
  // Generate response tokens
  const token: IAuthorizationToken = {
    access: session.access_token,
    refresh: session.refresh_token,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return authorized response
  return {
    id: seller.id,
    email: seller.email,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description,
    logo_image_url: seller.logo_image_url,
    account_status: seller.account_status,
    approval_reason: seller.approval_reason,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token,
  } satisfies IEcommerceSeller.IAuthorized;
}
