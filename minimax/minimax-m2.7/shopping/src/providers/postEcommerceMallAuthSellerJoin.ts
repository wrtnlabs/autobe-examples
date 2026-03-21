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
  // 1. Check for duplicate email registration
  const existing = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash the password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Generate timestamps and IDs
  const sellerId = v4() as string & tags.Format<"uuid">;
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 4. Create seller record with pending approval status
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: passwordHash,
      approval_status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      rejection_reason: null,
      rejected_at: null,
    },
    select: {
      id: true,
      email: true,
      approval_status: true,
      rejection_reason: true,
      rejected_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 5. Create initial seller_approval record with pending status
  await MyGlobal.prisma.ecommerce_mall_seller_approvals.create({
    data: {
      id: v4(),
      ecommerce_mall_seller_id: seller.id,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      reviewed_by_admin_id: null,
      rejection_reason: null,
    },
  });
  // 6. Generate JWT tokens
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: now,
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
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create session record in database
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: seller.id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: accessToken,
      refresh_token: refreshToken,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 8. Return authorized response with token
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    token,
    id: seller.id,
    email: seller.email,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason,
    rejected_at:
      (seller.rejected_at?.toISOString() as string &
        tags.Format<"date-time">) ?? null,
    created_at: seller.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: seller.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      (seller.deleted_at?.toISOString() as string & tags.Format<"date-time">) ??
      null,
  };
}
