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
  // Validate email uniqueness
  const existing = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate UUID for seller
  const sellerId: string & tags.Format<"uuid"> = v4();
  // Create seller account (PasswordUtil handles hashing internally)
  const createdSeller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Generate session ID
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Calculate token expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Create session record
  const createdSession =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
      data: {
        id: sessionId,
        seller_id: sellerId,
        access_token: "",
        refresh_token: "",
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: sellerId,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: sellerId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // Update session with tokens
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
    },
  });
  // Build response with proper type conversions
  const response: IEcommerceMallSeller.IAuthorized = {
    id: createdSeller.id,
    email: createdSeller.email,
    created_at: createdSeller.created_at.toISOString(),
    updated_at: createdSeller.updated_at.toISOString(),
    deleted_at: createdSeller.deleted_at?.toISOString() ?? null,
    token,
  };
  return response;
}
