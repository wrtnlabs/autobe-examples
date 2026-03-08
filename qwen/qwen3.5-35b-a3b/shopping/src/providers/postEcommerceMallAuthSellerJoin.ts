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
  const existingSeller =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
      where: { email: props.body.email },
    });
  if (existingSeller !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const expiresAt24h: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const sellerId: string & tags.Format<"uuid"> = v4();
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      approval_status: "pending",
      is_suspended: false,
      is_banned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const sessionId: string & tags.Format<"uuid"> = v4();
  const ip: string = props.body.ip ?? "0.0.0.0";
  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      seller_id: seller.id,
      ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const verificationId: string & tags.Format<"uuid"> = v4();
  const token: string = v4();
  await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.create({
    data: {
      id: verificationId,
      seller_id: seller.id,
      token,
      expires_at: expiresAt24h,
      used_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const accessToken: string = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const tokenData: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  const authorizedResponse: IEcommerceMallSeller.IAuthorized = {
    id: seller.id,
    email: seller.email,
    approval_status: typia.assert<"pending" | "approved" | "rejected">(
      seller.approval_status,
    ),
    rejection_reason: seller.rejection_reason ?? null,
    is_suspended: seller.is_suspended,
    is_banned: seller.is_banned,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at === null ? null : toISOStringSafe(seller.deleted_at),
    token: tokenData,
  };
  return authorizedResponse;
}
