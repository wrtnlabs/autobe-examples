import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

export async function postAuthSellerJoin(props: {
  body: IShoppingSeller.IJoin;
}): Promise<IShoppingSeller.IAuthorized> {
  // 1. Email uniqueness check
  const existing = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());

  // 3. Create seller record
  const seller = await MyGlobal.prisma.shopping_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      display_name: props.body.display_name,
      contact_phone: props.body.contact_phone,
      status: "pending",
      created_at: now,
      updated_at: now,
    },
  });

  // 4. Create session
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.shopping_seller_sessions.create({
    data: {
      id: v4(),
      shopping_seller_id: seller.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });

  // 5. Create JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // 6. Build and return response
  return {
    id: seller.id,
    email: seller.email,
    display_name: seller.display_name,
    contact_phone: seller.contact_phone,
    status: seller.status,
    is_active: seller.deleted_at == null,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    token: token,
  };
}
