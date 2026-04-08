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
import { EcommerceSellerTransformer } from "../transformers/EcommerceSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthSellerJoin(props: {
  ip: string;
  body: IEcommerceSeller.IJoin;
}): Promise<IEcommerceSeller.IAuthorized> {
  // 1. Check email uniqueness
  const existing = await MyGlobal.prisma.ecommerce_sellers.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Generate IDs and timestamps
  const sellerId: string & tags.Format<"uuid"> = v4();
  const profileId: string & tags.Format<"uuid"> = v4();
  const approvalId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // 3. Hash password
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  // 4. Create seller account
  await MyGlobal.prisma.ecommerce_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: passwordHash,
      approval_status: "pending",
      rejection_reason: null,
      is_suspended: false,
      is_banned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create seller profile with default shop name from email prefix
  const shopName: string = props.body.email
    .split("@")[0]
    .replace(/[._-]/g, " ");
  await MyGlobal.prisma.ecommerce_seller_profiles.create({
    data: {
      id: profileId,
      ecommerce_seller_id: sellerId,
      shop_name: shopName,
      shop_description: null,
      logo_image_url: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Create approval request
  await MyGlobal.prisma.ecommerce_seller_approvals.create({
    data: {
      id: approvalId,
      seller_id: sellerId,
      reviewed_by_admin_id: null,
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 7. Generate JWT tokens
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken: string = jwt.sign(
    {
      type: "seller",
      id: sellerId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
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
  // 8. Create session
  await MyGlobal.prisma.ecommerce_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_seller_id: sellerId,
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
  // 9. Fetch seller with profile for response
  const sellerWithProfile =
    await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
      where: { id: sellerId },
      ...EcommerceSellerTransformer.select(),
    });
  // 10. Transform to response DTO
  const sellerDto: IEcommerceSeller =
    await EcommerceSellerTransformer.transform(sellerWithProfile);
  // 11. Return IAuthorized
  return {
    id: sellerDto.id,
    approval_status: sellerDto.approval_status,
    rejection_reason: sellerDto.rejection_reason,
    is_suspended: sellerDto.is_suspended,
    is_banned: sellerDto.is_banned,
    created_at: sellerDto.created_at,
    updated_at: sellerDto.updated_at,
    deleted_at: sellerDto.deleted_at,
    profile: sellerDto.profile,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IEcommerceSeller.IAuthorized;
}
