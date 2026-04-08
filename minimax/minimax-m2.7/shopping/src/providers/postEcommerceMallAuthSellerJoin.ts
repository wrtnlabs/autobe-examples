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
import { EcommerceMallSellerCollector } from "../collectors/EcommerceMallSellerCollector";
import { EcommerceMallSellerApprovalAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalAtSummaryTransformer";
import { EcommerceMallSellerProfileAtSummaryTransformer } from "../transformers/EcommerceMallSellerProfileAtSummaryTransformer";
import { EcommerceMallSellerSuspensionAtSummaryTransformer } from "../transformers/EcommerceMallSellerSuspensionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSellerJoin(props: {
  ip: string;
  body: IEcommerceMallSeller.IJoin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create seller with pending approval status (Collector handles password hashing)
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: await EcommerceMallSellerCollector.collect({
      body: props.body,
    }),
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
  // 3. Create email verification token with 24-hour expiration
  const verificationToken = v4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.create({
    data: {
      id: v4(),
      ecommerce_mall_seller_id: seller.id,
      token: verificationToken,
      email: props.body.email,
      expires_at: expiresAt,
      verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 4. Query profile (may be null for newly registered sellers)
  const profile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirst({
      where: { seller_id: seller.id },
      ...EcommerceMallSellerProfileAtSummaryTransformer.select(),
    });
  // 5. Query approval history (empty for new registrations)
  const approvals =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findMany({
      where: { ecommerce_mall_seller_id: seller.id },
      ...EcommerceMallSellerApprovalAtSummaryTransformer.select(),
    });
  // 6. Query suspension history (empty for new registrations)
  const suspensions =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
      where: { ecommerce_mall_seller_id: seller.id },
      ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
    });
  // 7. Build and return IAuthorized response
  return {
    id: seller.id,
    email: seller.email,
    approvalStatus: seller.approval_status as
      | "pending"
      | "approved"
      | "rejected",
    rejectionReason: seller.rejection_reason,
    rejectedAt: seller.rejected_at ? toISOStringSafe(seller.rejected_at) : null,
    profile: profile
      ? await EcommerceMallSellerProfileAtSummaryTransformer.transform(profile)
      : (null as unknown as IEcommerceMallSellerProfile.ISummary),
    sellerApprovals: await ArrayUtil.asyncMap(
      approvals,
      EcommerceMallSellerApprovalAtSummaryTransformer.transform,
    ),
    sellerSuspensions: await ArrayUtil.asyncMap(
      suspensions,
      EcommerceMallSellerSuspensionAtSummaryTransformer.transform,
    ),
    approvalCount: approvals.length,
    suspensionCount: suspensions.length,
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token: null as unknown as IAuthorizationToken,
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
// export async function postEcommerceMallAuthSellerJoin(props: {
//   ip: string;
//   body: IEcommerceMallSeller.IJoin;
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