import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function postEcommerceMallAuthSellerJoin(props: {
  body: IEcommerceMallSeller.IJoin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create seller account
  const sellerId = v4() satisfies string & tags.Format<"uuid">;
  const now = new Date();
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      shop_name: props.body.shop_name,
      shop_description: props.body.shop_description ?? null,
      approval_status: "pending",
      account_status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4() satisfies string & tags.Format<"uuid">;
  const createdAt = new Date().toISOString();
  const access = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 4. Create session record with tokens
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_sellers_id: seller.id,
      access_token: access,
      refresh_token: refresh,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 5. Build response
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: seller.id,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description ?? undefined,
    approval_status: typia.assert<"pending" | "approved" | "rejected">(
      seller.approval_status,
    ),
    account_status: typia.assert<"active" | "suspended" | "banned">(
      seller.account_status,
    ),
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    rejection_reason: seller.rejection_reason,
    token,
    seller: {
      id: seller.id,
      email: seller.email,
      shop_name: seller.shop_name,
      shop_description: seller.shop_description ?? null,
      approval_status: typia.assert<"pending" | "approved" | "rejected">(
        seller.approval_status,
      ),
      rejection_reason: seller.rejection_reason ?? null,
      account_status: typia.assert<"active" | "suspended" | "banned">(
        seller.account_status,
      ),
      created_at: toISOStringSafe(seller.created_at),
    },
  } satisfies IEcommerceMallSeller.IAuthorized;
}
