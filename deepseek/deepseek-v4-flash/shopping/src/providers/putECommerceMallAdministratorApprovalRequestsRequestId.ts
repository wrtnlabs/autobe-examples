import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallSellerApprovalRequestTransformer } from "../transformers/ECommerceMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallAdministratorApprovalRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IECommerceMallSellerApprovalRequest.IUpdate;
}): Promise<IECommerceMallSellerApprovalRequest> {
  // Fetch the approval request with seller info for validation
  const approvalRequest =
    await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        status: true,
        seller_id: true,
        seller: {
          select: {
            id: true,
            approval_status: true,
            deleted_at: true,
          },
        },
      },
    });
  // Request not found → 404
  if (approvalRequest === null) {
    throw new HttpException("Approval request not found", 404);
  }
  // Seller is soft-deleted → 404 (orphaned request)
  if (approvalRequest.seller.deleted_at !== null) {
    throw new HttpException("Approval request not found", 404);
  }
  // Already reviewed → 422 Conflict
  if (approvalRequest.status !== "pending") {
    throw new HttpException("Approval request has already been reviewed", 422);
  }
  const status = props.body.status;
  const rejectionReason = props.body.rejection_reason;
  // Status must be provided for a review decision
  if (status === undefined) {
    throw new HttpException(
      "Review decision status is required. Must be 'approved' or 'rejected'.",
      422,
    );
  }
  if (status === "approved") {
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.e_commerce_mall_seller_approval_requests.update({
        where: { id: props.requestId },
        data: {
          status: "approved",
          reviewer_id: props.administrator.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }),
      MyGlobal.prisma.e_commerce_mall_sellers.update({
        where: { id: approvalRequest.seller_id },
        data: {
          approval_status: "approved",
          updated_at: new Date().toISOString(),
        },
      }),
    ]);
  } else if (status === "rejected") {
    // Validate rejection_reason is provided and non-empty
    if (
      rejectionReason === undefined ||
      rejectionReason === null ||
      rejectionReason.trim().length === 0
    ) {
      throw new HttpException(
        "Rejection reason is required when rejecting a seller registration request",
        422,
      );
    }
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.e_commerce_mall_seller_approval_requests.update({
        where: { id: props.requestId },
        data: {
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewer_id: props.administrator.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }),
      MyGlobal.prisma.e_commerce_mall_sellers.update({
        where: { id: approvalRequest.seller_id },
        data: {
          approval_status: "rejected",
          updated_at: new Date().toISOString(),
        },
      }),
    ]);
  }
  // Fetch updated record using transformer
  const updated =
    await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ECommerceMallSellerApprovalRequestTransformer.select(),
      },
    );
  return await ECommerceMallSellerApprovalRequestTransformer.transform(updated);
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
// import { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallAdministratorApprovalRequestsRequestId(props: {
//   administrator: AdministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IECommerceMallSellerApprovalRequest.IUpdate;
// }): Promise<IECommerceMallSellerApprovalRequest> {
//   await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallSellerApprovalRequestTransformer.select(),
//   });
//   return await ECommerceMallSellerApprovalRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------