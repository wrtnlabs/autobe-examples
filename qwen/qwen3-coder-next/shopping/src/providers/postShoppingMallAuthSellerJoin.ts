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

export async function postShoppingMallAuthSellerJoin(props: {
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const { email, password, shop_name, shop_description, logo_image_url } =
    props.body;
  // 1. Check duplicate email
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { email },
    });
  if (existingCustomer)
    throw new HttpException("Email already registered", 409);
  // 2. Create customer record
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email,
      password_hash: await PasswordUtil.hash(password),
      email_verified: false,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 3. Create seller record
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_user_id: customer.id,
      shop_name,
      shop_description,
      logo_image_url,
      approval_status: "pending",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      shop_name: true,
      shop_description: true,
      logo_image_url: true,
      approval_status: true,
      approval_date: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 4. Create session record
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_seller_id: seller.id,
      ip: "127.0.0.1",
      href: "/shoppingMall/auth/seller/join",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    },
  });
  // 5. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessPayload = {
    type: "seller",
    id: seller.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const refreshPayload = {
    type: "seller",
    id: seller.id,
    session_id: session.id,
    tokenType: "refresh",
    created_at: toISOStringSafe(new Date()),
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // 6. Build token responses
  // IShoppingMallSellerSessions (data.token) - access, refresh, expired_at
  const sellerToken: IShoppingMallSellerSessions = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
  };
  // IAuthorizationToken (root token) - access, refresh, expired_at, refreshable_until
  const mainToken: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Return IAuthorized response with correct structure per DTO definition
  return {
    data: {
      profile: {
        id: seller.id,
        shop_name: seller.shop_name,
        approval_status: seller.approval_status,
        created_at: toISOStringSafe(seller.created_at),
      },
      token: sellerToken,
    },
    token: mainToken,
    meta: {
      version: "1.0",
    },
  };
}
