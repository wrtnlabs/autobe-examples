import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthBuyerJoin(props: {
  body: IShoppingMallBuyer.ICreate;
}): Promise<IShoppingMallBuyer.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_buyers.findFirst({
    where: { email: props.body.email },
  });

  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      full_name: props.body.full_name,
      phone_number: props.body.phone_number ?? null,
      email_verified: false,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.shopping_mall_buyer_sessions.create({
    data: {
      id: v4(),
      shopping_mall_buyer_id: buyer.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "buyer",
        id: buyer.id,
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
        type: "buyer",
        id: buyer.id,
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
    id: buyer.id,
    email: buyer.email,
    full_name: buyer.full_name,
    phone_number: buyer.phone_number ?? undefined,
    email_verified: buyer.email_verified,
    created_at: toISOStringSafe(buyer.created_at),
    updated_at: toISOStringSafe(buyer.updated_at),
    deleted_at:
      buyer.deleted_at !== null && buyer.deleted_at !== undefined
        ? toISOStringSafe(buyer.deleted_at)
        : undefined,
    token,
  };
}
