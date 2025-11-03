import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postAuthSellerJoin(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Check existing seller by email
  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });

  if (existingSeller !== null) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Current timestamp string
  const currentTimestamp = toISOStringSafe(new Date());

  // Create seller
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      store_name: props.body.store_name,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });

  // Compute expiration timestamps as ISO strings
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create session for seller
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      created_at: currentTimestamp,
      expired_at: accessExpires,
      ip: "",
      href: "",
      referrer: "",
    },
  });

  // Generate now ISO string
  const nowISO = toISOStringSafe(new Date());

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: nowISO,
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
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // Return authorized seller with token
  return {
    id: seller.id,
    email: seller.email,
    password_hash: seller.password_hash,
    store_name: seller.store_name,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: null,
    token,
  };
}
