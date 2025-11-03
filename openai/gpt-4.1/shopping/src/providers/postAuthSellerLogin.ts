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

export async function postAuthSellerLogin(props: {
  body: IShoppingSeller.ILogin;
}): Promise<IShoppingSeller.IAuthorized> {
  // 1. Find the seller by email (do not distinguish not found, for anti-enumeration)
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  // 2. Validate credentials (generic failure for invalid)
  const isActive =
    !!seller && seller.deleted_at === null && seller.status !== "suspended";
  if (!seller || !isActive) {
    throw new HttpException("Invalid credentials", 401);
  }
  const passwordOk = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!passwordOk) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const now = toISOStringSafe(new Date());
  const session = await MyGlobal.prisma.shopping_seller_sessions.create({
    data: {
      id: v4(),
      shopping_seller_id: seller.id,
      ip: props.body.ip ?? "", // fallback to empty string if missing
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiredAt,
    },
  });
  // 4. Generate tokens
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
        created_at: now,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };
  // 5. Return authorized DTO
  return {
    id: seller.id,
    email: seller.email,
    display_name: seller.display_name,
    contact_phone: seller.contact_phone,
    status: seller.status,
    is_active: isActive,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    token,
  };
}
