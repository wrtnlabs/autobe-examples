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
  // 1. Find seller by email with password_hash for verification
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      approval_status: true,
      rejection_reason: true,
      is_suspended: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 2. Validate account exists and is not banned
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.is_banned) {
    throw new HttpException("Account is banned", 401);
  }
  // 3. Check approval status - only 'approved' can login
  if (seller.approval_status !== "approved") {
    throw new HttpException("Account approval pending", 401);
  }
  // 4. Verify password using constant-time comparison
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Create new session record
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: v4(),
      seller_id: seller.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href ?? "http://localhost",
      referrer: props.body.referrer ?? "http://localhost",
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 6. Generate JWT tokens
  const now = toISOStringSafe(new Date());
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 7. Return IAuthorized pattern
  return {
    id: seller.id,
    email: seller.email,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason ?? null,
    is_suspended: seller.is_suspended,
    is_banned: seller.is_banned,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at != null ? toISOStringSafe(seller.deleted_at) : null,
    token,
  } satisfies IEcommerceMallSeller.IAuthorized;
}
