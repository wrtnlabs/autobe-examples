import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerProfileTransformer } from "../transformers/EcommerceMallSellerProfileTransformer";
import { EcommerceMallSellerTransformer } from "../transformers/EcommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSellerRefresh(props: {
  body: IEcommerceMallSeller.IRefresh;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Define typed interface for JWT payload
  interface IJwtPayload {
    type: string;
    id: string;
    session_id: string;
    created_at: string & tags.Format<"date-time">;
    tokenType?: string;
  }
  // 2. Verify refresh token and extract claims
  let decoded: IJwtPayload;
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as IJwtPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 3. Validate token type is seller
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type for this endpoint", 401);
  }
  // 4. Find session by refresh token value and seller ID
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirst({
      where: {
        refresh_token: props.body.refreshToken,
        ecommerce_mall_seller_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Check session expiration using ISO string comparison
  const nowIso = new Date().toISOString();
  const expiredAtIso = session.expired_at.toISOString();
  if (expiredAtIso <= nowIso) {
    throw new HttpException("Session expired", 401);
  }
  // 6. Query seller with profile for response
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: decoded.id },
    ...EcommerceMallSellerTransformer.select(),
  });
  if (!seller) {
    throw new HttpException("Seller not found", 401);
  }
  // 7. Check seller is not deleted
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  // 8. Check profile exists (required for response)
  if (seller.profile === null || seller.profile === undefined) {
    throw new HttpException("Seller profile not found", 500);
  }
  // 9. Generate new tokens with same session_id (token rotation)
  const accessExpiresIn = 60 * 60 * 1000; // 1 hour in milliseconds
  const refreshExpiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + accessExpiresIn);
  const refreshExpiresAt = new Date(now.getTime() + refreshExpiresIn);
  const newAccessToken = jwt.sign(
    {
      type: "seller" as const,
      id: seller.id as string & tags.Format<"uuid">,
      session_id: session.id as string & tags.Format<"uuid">,
      created_at: now.toISOString() as string & tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "seller" as const,
      id: seller.id as string & tags.Format<"uuid">,
      session_id: session.id as string & tags.Format<"uuid">,
      tokenType: "refresh" as const,
      created_at: now.toISOString() as string & tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 10. Update session with new tokens and extended expiration
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpiresAt,
    },
  });
  // 11. Transform and return authorized response
  const transformedProfile =
    await EcommerceMallSellerProfileTransformer.transform(seller.profile);
  return {
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email as string & tags.Format<"email">,
    approvalStatus: seller.approval_status as
      | "pending"
      | "approved"
      | "rejected",
    rejectionReason: seller.rejection_reason,
    rejectedAt:
      seller.rejected_at !== null ? toISOStringSafe(seller.rejected_at) : null,
    profile: transformedProfile,
    productsCount: seller.products.length as number & tags.Type<"int32">,
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt:
      seller.deleted_at !== null ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthSellerRefresh(props: {
//   body: IEcommerceMallSeller.IRefresh;
// }): Promise<IEcommerceMallSeller.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     approvalStatus: ...,
//     rejectionReason: ...,
//     rejectedAt: ...,
//     profile: await EcommerceMallSellerProfileTransformer.transform(...),
//     productsCount: ...,
//     createdAt: ...,
//     updatedAt: ...,
//     deletedAt: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------