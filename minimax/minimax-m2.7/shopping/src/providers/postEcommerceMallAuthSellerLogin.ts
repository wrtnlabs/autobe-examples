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
  ip: string;
  body: IEcommerceMallSeller.ILogin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Find seller by email with password_hash explicitly selected
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      approval_status: true,
      rejection_reason: true,
      rejected_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 2. Verify seller exists
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Generate expiration timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 5. Generate session ID
  const sessionId = v4();
  // 6. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create session record
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: seller.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: accessToken,
      refresh_token: refreshToken,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 8. Return IAuthorized response
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
    id: seller.id,
    email: seller.email,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason ?? undefined,
    rejected_at: seller.rejected_at
      ? (seller.rejected_at.toISOString() as string & tags.Format<"date-time">)
      : undefined,
    created_at: seller.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: seller.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: seller.deleted_at
      ? (seller.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : undefined,
  };
}
