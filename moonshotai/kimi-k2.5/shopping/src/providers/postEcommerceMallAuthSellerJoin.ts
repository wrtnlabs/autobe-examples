import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
  ip: string;
  body: IEcommerceMallSeller.IJoin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // Check email uniqueness
  const existing = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Create seller
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const sellerId = v4() as string & tags.Format<"uuid">;
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: passwordHash,
      approval_status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create seller registration
  const registrationId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.create({
    data: {
      id: registrationId,
      seller_id: sellerId,
      reviewer_id: null,
      status: "pending",
      rejection_reason: null,
      created_at: now,
      updated_at: now,
      reviewed_at: null,
    },
  });
  // Create session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiredAt = accessExpires.toISOString() as string &
    tags.Format<"date-time">;
  const refreshableUntil = refreshExpires.toISOString() as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: sellerId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: expiredAt,
    },
  });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: sellerId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: sellerId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  // Construct response
  const authorized: IEcommerceMallSeller.IAuthorized = {
    id: sellerId,
    email: props.body.email,
    approvalStatus: "pending",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    profile: null,
    token,
  };
  return authorized;
}
