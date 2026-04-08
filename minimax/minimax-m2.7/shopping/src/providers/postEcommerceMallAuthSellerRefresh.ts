import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerApprovalAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalAtSummaryTransformer";
import { EcommerceMallSellerProfileAtSummaryTransformer } from "../transformers/EcommerceMallSellerProfileAtSummaryTransformer";
import { EcommerceMallSellerSuspensionAtSummaryTransformer } from "../transformers/EcommerceMallSellerSuspensionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSellerRefresh(props: {
  body: IEcommerceMallSeller.IRefresh;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Find session and validate
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_mall_seller_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session expiration using ISO string comparison
  const now = new Date().toISOString();
  if (session.expired_at && session.expired_at.toISOString() < now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate seller exists, approved, and not deleted
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: decoded.id },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 401);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller not approved", 401);
  }
  // 6. Generate new tokens (SAME session_id for continuity)
  const nowForTokens = new Date();
  const accessExpiresMs = nowForTokens.getTime() + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = nowForTokens.getTime() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpiresIso = new Date(accessExpiresMs).toISOString();
  const refreshExpiresIso = new Date(refreshExpiresMs).toISOString();
  const createdAtIso = nowForTokens.toISOString();
  const newAccessToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: new Date(refreshExpiresMs),
    },
  });
  // 8. Fetch seller data with profile, approvals, suspensions for response
  const sellerData =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        rejected_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: EcommerceMallSellerProfileAtSummaryTransformer.select(),
      },
    });
  // Fetch approvals and suspensions counts and records
  const [approvals, suspensions] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_approvals.findMany({
      where: { ecommerce_mall_seller_id: decoded.id },
      orderBy: { created_at: "desc" },
      ...EcommerceMallSellerApprovalAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
      where: { ecommerce_mall_seller_id: decoded.id },
      orderBy: { created_at: "desc" },
      ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
    }),
  ]);
  // 9. Build and return IAuthorized response
  return {
    id: sellerData.id,
    email: sellerData.email,
    approvalStatus: typia.assert<"approved" | "pending" | "rejected">(
      sellerData.approval_status,
    ),
    rejectionReason: sellerData.rejection_reason ?? null,
    rejectedAt: sellerData.rejected_at
      ? sellerData.rejected_at.toISOString()
      : null,
    profile: await EcommerceMallSellerProfileAtSummaryTransformer.transform(
      sellerData.profile!,
    ),
    sellerApprovals: await ArrayUtil.asyncMap(approvals, (r) =>
      EcommerceMallSellerApprovalAtSummaryTransformer.transform(r),
    ),
    sellerSuspensions: await ArrayUtil.asyncMap(suspensions, (r) =>
      EcommerceMallSellerSuspensionAtSummaryTransformer.transform(r),
    ),
    approvalCount: approvals.length,
    suspensionCount: suspensions.length,
    createdAt: sellerData.created_at.toISOString(),
    updatedAt: sellerData.updated_at.toISOString(),
    deletedAt: sellerData.deleted_at
      ? sellerData.deleted_at.toISOString()
      : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
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
// import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
//     profile: await EcommerceMallSellerProfileAtSummaryTransformer.transform(...),
//     sellerApprovals: await ArrayUtil.asyncMap(..., (r) => EcommerceMallSellerApprovalAtSummaryTransformer.transform(r)),
//     sellerSuspensions: await ArrayUtil.asyncMap(..., (r) => EcommerceMallSellerSuspensionAtSummaryTransformer.transform(r)),
//     approvalCount: ...,
//     suspensionCount: ...,
//     createdAt: ...,
//     updatedAt: ...,
//     deletedAt: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------