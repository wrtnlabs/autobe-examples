import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerApprovalRequestTransformer } from "../transformers/EcommerceMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdministratorSellerApprovalsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerApprovalRequest.IUpdate;
}): Promise<IEcommerceMallSellerApprovalRequest> {
  // Validate status in body is provided and is valid
  if (props.body.status !== undefined) {
    if (props.body.status !== "approved" && props.body.status !== "rejected") {
      throw new HttpException("Invalid status value", 400);
    }
    // When rejecting, rejection_reason is required and must be non-empty
    if (
      props.body.status === "rejected" &&
      (!props.body.rejection_reason ||
        props.body.rejection_reason.trim().length === 0)
    ) {
      throw new HttpException(
        "Rejection reason is required when rejecting",
        400,
      );
    }
    // When approving, rejection_reason must not be provided
    if (
      props.body.status === "approved" &&
      props.body.rejection_reason !== undefined
    ) {
      throw new HttpException(
        "Rejection reason must not be provided when approving",
        400,
      );
    }
  }
  // Fetch existing approval request with seller and reviewer joins
  const existing =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          deleted_at: null,
        },
        ...EcommerceMallSellerApprovalRequestTransformer.select(),
      },
    );
  // Validate request is pending
  if (existing.status !== "pending") {
    throw new HttpException("Approval request is not pending", 400);
  }
  // Create snapshot of current state before update
  const snapshotData: Prisma.ecommerce_mall_seller_approval_request_snapshotsCreateInput =
    {
      id: v4(),
      snapshot_time: new Date(),
      approvalRequest: {
        connect: { id: props.requestId },
      },
      status: existing.status,
      rejection_reason: existing.rejection_reason,
      created_at: existing.created_at,
      updated_at: existing.updated_at,
    };
  if (existing.reviewer !== null) {
    snapshotData.approverAdministrator = {
      connect: { id: existing.reviewer.id },
    };
  }
  await MyGlobal.prisma.ecommerce_mall_seller_approval_request_snapshots.create(
    {
      data: snapshotData,
    },
  );
  // Prepare update data
  const updateData: Prisma.ecommerce_mall_seller_approval_requestsUpdateInput =
    {
      updated_at: toISOStringSafe(new Date()),
    };
  // Set status if provided
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  // Set reviewer if not already set (for pending requests)
  if (existing.reviewer === null) {
    updateData.reviewer = { connect: { id: props.administrator.id } };
  }
  // Set rejection_reason if provided in body
  if (props.body.rejection_reason !== undefined) {
    updateData.rejection_reason = props.body.rejection_reason;
  }
  // Update the approval request
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.update({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
      data: updateData,
      ...EcommerceMallSellerApprovalRequestTransformer.select(),
    });
  return await EcommerceMallSellerApprovalRequestTransformer.transform(updated);
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
// import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallAdministratorSellerApprovalsRequestId(props: {
//   administrator: AdministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSellerApprovalRequest.IUpdate;
// }): Promise<IEcommerceMallSellerApprovalRequest> {
//   await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallSellerApprovalRequestTransformer.select(),
//   });
//   return await EcommerceMallSellerApprovalRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------