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

export async function postEcommerceMallAdminAdminSellerApprovalsApprovalIdReject(props: {
  admin: AdminPayload;
  approvalId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerApproval.IReject;
}): Promise<IEcommerceMallSellerApproval> {
  // Find the approval record with seller and admin relations
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findFirstOrThrow({
      where: { id: props.approvalId },
      ...EcommerceMallSellerApprovalTransformer.select(),
    });
  // Verify approval is still pending
  if (record.status !== "pending") {
    throw new HttpException("Seller approval is not in pending status", 409);
  }
  // Update both seller_approval and seller in a transaction
  await MyGlobal.prisma.$transaction([
    // Update the seller approval record
    MyGlobal.prisma.ecommerce_mall_seller_approvals.update({
      where: { id: props.approvalId },
      data: {
        status: "rejected",
        rejection_reason: props.body.rejectionReason,
        reviewed_by_admin_id: props.admin.id,
        updated_at: new Date(),
      },
    }),
    // Update the seller account status
    MyGlobal.prisma.ecommerce_mall_sellers.update({
      where: { id: record.seller.id },
      data: {
        approval_status: "rejected",
        rejection_reason: props.body.rejectionReason,
        rejected_at: new Date(),
        updated_at: new Date(),
      },
    }),
  ]);
  // Fetch the updated record with all relations for response
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findFirstOrThrow({
      where: { id: props.approvalId },
      ...EcommerceMallSellerApprovalTransformer.select(),
    });
  return await EcommerceMallSellerApprovalTransformer.transform(updated);
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
// export async function postEcommerceMallAdminAdminSellerApprovalsApprovalIdReject(props: {
//   admin: AdminPayload;
//   approvalId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSellerApproval.IReject;
// }): Promise<IEcommerceMallSellerApproval> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_approvals.findFirstOrThrow({
//     ...EcommerceMallSellerApprovalTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerApprovalTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------