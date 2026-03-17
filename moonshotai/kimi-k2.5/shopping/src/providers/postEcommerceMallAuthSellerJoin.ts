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
  ip: string;
  body: IEcommerceMallSeller.IJoin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // Validate email uniqueness across customers and sellers
  const [existingCustomer, existingSeller] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_customers.findFirst({
      where: { email: props.body.email },
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
      where: { email: props.body.email },
    }),
  ]);
  if (existingCustomer || existingSeller) {
    throw new HttpException("Email already registered", 409);
  }
  const now = new Date();
  const sellerId = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create seller record
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: passwordHash,
      approval_status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.ecommerce_mall_sellersCreateInput,
  });
  // Calculate token expiration
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  // Create session record
  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      seller: { connect: { id: seller.id } },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    } satisfies Prisma.ecommerce_mall_seller_sessionsCreateInput,
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // Return authorized seller response (newly registered seller has no profile)
  return {
    id: seller.id,
    email: seller.email,
    shopName: null,
    shopDescription: null,
    logoImageUrl: null,
    approvalStatus: seller.approval_status,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt: seller.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IEcommerceMallSeller.IAuthorized;
}
