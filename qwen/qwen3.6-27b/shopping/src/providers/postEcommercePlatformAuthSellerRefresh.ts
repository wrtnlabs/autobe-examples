import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
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

export async function postEcommercePlatformAuthSellerRefresh(props: {
  body: IEcommercePlatformSeller.IRefresh;
}): Promise<IEcommercePlatformSeller.IAuthorized> {
  // 1. Decode & verify refresh token
  const verified = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  const decoded =
    typeof verified === "object" && verified !== null && "type" in verified
      ? (verified as unknown as {
          type: string;
          id: string;
          session_id: string;
        })
      : null;
  if (!decoded) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate actor type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Verify active session
  const session =
    await MyGlobal.prisma.ecommerce_platform_seller_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_platform_seller_id: decoded.id,
        expired_at: { gt: new Date() },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Verify seller account status
  const seller =
    await MyGlobal.prisma.ecommerce_platform_sellers.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (seller.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new token pair
  const accessLifetime = 60 * 60 * 1000; // 1 hour
  const refreshLifetime = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = new Date();
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Extend session expiration
  await MyGlobal.prisma.ecommerce_platform_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(now.getTime() + refreshLifetime) },
  });
  // 7. Fetch seller profile
  const profile =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findUnique({
      where: { seller_id: seller.id },
    });
  // 8. Construct response DTO
  return {
    id: seller.id,
    email: seller.email,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason,
    is_banned: seller.is_banned,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: toISOStringSafe(
      seller.deleted_at ?? new Date("9999-12-31T23:59:59.999Z"),
    ),
    shop_name: profile?.shop_name ?? null,
    shop_description: profile?.shop_description ?? null,
    logo_image_uri: profile?.logo_image_uri ?? null,
    profile_created_at:
      profile?.created_at != null ? toISOStringSafe(profile.created_at) : null,
    profile_updated_at:
      profile?.updated_at != null ? toISOStringSafe(profile.updated_at) : null,
    profile_deleted_at:
      profile?.deleted_at != null ? toISOStringSafe(profile.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(now.getTime() + accessLifetime)),
      refreshable_until: toISOStringSafe(
        new Date(now.getTime() + refreshLifetime),
      ),
    },
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformAuthSellerRefresh(props: {
//   body: IEcommercePlatformSeller.IRefresh;
// }): Promise<IEcommercePlatformSeller.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------