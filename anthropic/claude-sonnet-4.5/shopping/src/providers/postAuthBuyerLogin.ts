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

export async function postAuthBuyerLogin(props: {
  body: IShoppingMallBuyer.ILogin;
}): Promise<IShoppingMallBuyer.IAuthorized> {
  // Phase 1: Find buyer by email (case-insensitive)
  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findFirst({
    where: {
      email: {
        equals: props.body.email,
        mode: "insensitive",
      },
    },
  });

  if (!buyer) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 2: Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    buyer.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 3: Create new session record
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.shopping_mall_buyer_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_buyer_id: buyer.id,
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Phase 4: Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "buyer",
        id: buyer.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
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

  // Phase 5: Return buyer profile with authorization tokens
  return {
    id: buyer.id,
    email: buyer.email,
    full_name: buyer.full_name,
    phone_number: buyer.phone_number ?? undefined,
    email_verified: buyer.email_verified,
    created_at: toISOStringSafe(buyer.created_at),
    updated_at: toISOStringSafe(buyer.updated_at),
    deleted_at: buyer.deleted_at
      ? toISOStringSafe(buyer.deleted_at)
      : undefined,
    token,
  };
}
