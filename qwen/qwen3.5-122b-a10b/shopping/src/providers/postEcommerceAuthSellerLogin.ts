import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSellerProfileTransformer } from "../transformers/EcommerceSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthSellerLogin(props: {
  ip: string;
  body: IEcommerceSeller.ILogin;
}): Promise<IEcommerceSeller.IAuthorized> {
  // 1. Find seller by email with password_hash explicitly selected
  const seller = await MyGlobal.prisma.ecommerce_sellers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      approval_status: true,
      rejection_reason: true,
      is_suspended: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
      profile: EcommerceSellerProfileTransformer.select(),
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
  // 3. Check account status
  if (seller.approval_status !== "approved") {
    throw new HttpException("Account not approved", 403);
  }
  if (seller.is_suspended === true) {
    throw new HttpException("Account suspended", 403);
  }
  if (seller.is_banned === true) {
    throw new HttpException("Account banned", 403);
  }
  // 4. Generate session ID
  const sessionId = v4() satisfies string as string & tags.Format<"uuid">;
  // 5. Calculate expiration timestamps
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // 6. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: toISOStringSafe(now),
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
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create session record
  await MyGlobal.prisma.ecommerce_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_seller_id: seller.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      expired_at: accessExpires,
    },
  });
  // 8. Return IAuthorized response
  return {
    id: seller.id,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason,
    is_suspended: seller.is_suspended,
    is_banned: seller.is_banned,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    profile: seller.profile
      ? await EcommerceSellerProfileTransformer.transform(seller.profile)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  } satisfies IEcommerceSeller.IAuthorized;
}
