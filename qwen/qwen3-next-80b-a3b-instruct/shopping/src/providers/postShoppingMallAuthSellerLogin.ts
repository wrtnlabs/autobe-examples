import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";

export async function postShoppingMallAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin;
  ip: string;
  href: string;
  referrer: string;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      ...ShoppingMallSellerTransformer.select().select,
      password_hash: true,
      is_approved: true,
      shop_name: true,
      shop_description: true,
      logo_image_url: true,
      id: true,
      email: true,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.is_approved !== true) {
    throw new HttpException("Account status must be approved for login", 403);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      seller_id: seller.id,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
      ip: props.ip,
      href: props.href,
      referrer: props.referrer,
    },
  });
  const token: IShoppingMallAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  const sellerData = await ShoppingMallSellerTransformer.transform(seller);
  return {
    ...sellerData,
    access_token: token.access,
    refresh_token: token.refresh,
    token,
    seller_id: seller.id,
    email: seller.email,
    role: "seller",
    status: seller.is_approved ? "approved" : "pending_verification",
  } satisfies IShoppingMallSeller.IAuthorized;
}
