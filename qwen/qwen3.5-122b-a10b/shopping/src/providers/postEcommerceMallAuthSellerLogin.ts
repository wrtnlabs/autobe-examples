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

export async function postEcommerceMallAuthSellerLogin(props: {
  body: IEcommerceMallSeller.ILogin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Find seller by email with password_hash explicitly selected
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      shop_name: true,
      shop_description: true,
      approval_status: true,
      rejection_reason: true,
      account_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check account status and deletion
  if (seller.account_status !== "active") {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Prepare token expiration times
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 5. Generate session ID first
  const sessionId = v4() as string & tags.Format<"uuid">;
  // 6. Generate JWT tokens before creating session
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create new session with tokens
  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_sellers_id: seller.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? "",
      href: props.body.href ?? "",
      referrer: props.body.referrer ?? null,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 8. Build token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 9. Return IAuthorized response
  return {
    id: seller.id as string & tags.Format<"uuid">,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description,
    approval_status: seller.approval_status,
    account_status: seller.account_status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    rejection_reason: seller.rejection_reason,
    token: token,
    seller: {
      id: seller.id as string & tags.Format<"uuid">,
      email: seller.email as string & tags.Format<"email">,
      shop_name: seller.shop_name,
      shop_description: seller.shop_description,
      approval_status: seller.approval_status as
        | "pending"
        | "approved"
        | "rejected",
      rejection_reason: seller.rejection_reason,
      account_status: seller.account_status as
        | "active"
        | "suspended"
        | "banned",
      created_at: toISOStringSafe(seller.created_at),
    } satisfies IEcommerceMallSeller.ISummary,
  } satisfies IEcommerceMallSeller.IAuthorized;
}
