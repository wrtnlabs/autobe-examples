import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerApprovalTransformer } from "../transformers/EcommerceMallSellerApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminSellerApprovalsApprovalIdApprove(props: {
  admin: AdminPayload;
  approvalId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerApproval> {
  // Step 1: Find the approval record with seller relation
  const approval =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findFirst({
      where: { id: props.approvalId },
      select: {
        id: true,
        status: true,
        ecommerce_mall_seller_id: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
          },
        },
      },
    });
  if (!approval) {
    throw new HttpException("Seller approval not found", 404);
  }
  // Step 2: Validate approval status is 'pending'
  if (approval.status !== "pending") {
    throw new HttpException(
      `Cannot approve seller approval with status: ${approval.status}. Only pending approvals can be approved.`,
      400,
    );
  }
  // Step 3: Check if seller is already approved (concurrent modification)
  if (approval.seller.approval_status === "approved") {
    throw new HttpException(
      "Seller is already approved. The approval may have been processed by another administrator.",
      409,
    );
  }
  // Step 4: Self-approval prevention - check if admin email matches seller email
  const adminAccount = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { id: props.admin.id },
    select: { email: true },
  });
  if (adminAccount && adminAccount.email === approval.seller.email) {
    throw new HttpException(
      "Administrators cannot approve their own seller account.",
      403,
    );
  }
  // Step 5: Get current timestamp as ISO string for consistency
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // Step 6: Execute transaction to update both records atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_seller_approvals.update({
      where: { id: props.approvalId },
      data: {
        status: "approved",
        reviewed_by_admin_id: props.admin.id,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.update({
      where: { id: approval.seller.id },
      data: {
        approval_status: "approved",
        rejection_reason: null,
        rejected_at: null,
        updated_at: new Date(),
      },
    }),
  ]);
  // Step 7: Fetch updated approval with all relations for response
  const updatedApproval =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findFirstOrThrow({
      where: { id: props.approvalId },
      ...EcommerceMallSellerApprovalTransformer.select(),
    });
  // Step 8: Transform and return the response
  return EcommerceMallSellerApprovalTransformer.transform(updatedApproval);
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
// import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAdminAdminSellerApprovalsApprovalIdApprove(props: {
//   admin: AdminPayload;
//   approvalId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerApproval> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_approvals.findFirstOrThrow({
//     ...EcommerceMallSellerApprovalTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerApprovalTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------