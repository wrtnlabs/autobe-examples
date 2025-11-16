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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postAuthSellerJoin(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const nowISOString = toISOStringSafe(new Date());
  const newSellerId = v4();

  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: newSellerId,
      email: props.body.email,
      password_hash: hashedPassword,
      name: props.body.name,
      status: "active",
      business_status: "pending",
      created_at: nowISOString,
      updated_at: nowISOString,
    },
  });

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessExpiresISOString = toISOStringSafe(accessExpires);
  const refreshExpiresISOString = toISOStringSafe(refreshExpires);

  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      created_at: nowISOString,
      expired_at: accessExpiresISOString,
      ip: "",
      href: "",
      referrer: "",
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: nowISOString,
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
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresISOString,
    refreshable_until: refreshExpiresISOString,
  };

  return {
    id: seller.id,
    email: seller.email,
    name: seller.name,
    status: typia.assert<"active" | "inactive" | "suspended">(seller.status),
    business_status: typia.assert<"approved" | "pending" | "rejected">(
      seller.business_status,
    ),
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at !== null && seller.deleted_at !== undefined
        ? toISOStringSafe(seller.deleted_at)
        : undefined,
    token,
  };
}
