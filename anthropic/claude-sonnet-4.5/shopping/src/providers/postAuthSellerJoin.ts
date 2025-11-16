import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthSellerJoin(props: {
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      OR: [{ email: props.body.email }, { store_name: props.body.store_name }],
    },
  });

  if (existing) {
    if (existing.email === props.body.email) {
      throw new HttpException("Email already registered", 409);
    }
    throw new HttpException("Store name already taken", 409);
  }

  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      full_name: props.body.full_name,
      phone_number: props.body.phone_number,
      business_name: props.body.business_name,
      business_description: props.body.business_description,
      store_name: props.body.store_name,
      status: "pending",
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: null,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
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
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: seller.id,
    email: seller.email,
    full_name: seller.full_name,
    phone_number: seller.phone_number,
    business_name: seller.business_name,
    business_description: seller.business_description,
    store_name: seller.store_name,
    status: seller.status,
    email_verified: seller.email_verified,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at === null
        ? undefined
        : toISOStringSafe(seller.deleted_at),
    token,
  };
}
