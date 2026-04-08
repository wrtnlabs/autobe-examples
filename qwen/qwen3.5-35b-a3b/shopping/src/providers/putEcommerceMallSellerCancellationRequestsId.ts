import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerCancellationRequestsId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IUpdate;
}): Promise<IEcommerceMallCancellationRequest> {
  // Validate status parameter
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid status value", 400);
  }
  // If rejected, validate rejection reason is provided
  if (props.body.status === "rejected" && !props.body.seller_rejection_reason) {
    throw new HttpException(
      "Rejection reason is required when status is rejected",
      400,
    );
  }
  // If approved, ensure rejection reason is null/omitted
  if (props.body.status === "approved" && props.body.seller_rejection_reason) {
    throw new HttpException(
      "Rejection reason should not be provided when status is approved",
      400,
    );
  }
  // Check if cancellation request exists and get current state
  const existing =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.id },
        include: {
          item: true,
        },
      },
    );
  // Verify ownership
  if (existing.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify request is still pending
  if (existing.status !== "pending") {
    throw new HttpException(
      "Cannot update a cancellation request that is already approved or rejected",
      409,
    );
  }
  // Execute update in transaction
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the cancellation request
    const updatedRequest = await tx.ecommerce_mall_cancellation_requests.update(
      {
        where: { id: props.id },
        data: {
          status: props.body.status,
          updated_at: toISOStringSafe(new Date()),
        },
      },
    );
    // Create snapshot for audit trail
    const snapshotId = v4();
    if (props.body.status === "approved") {
      await tx.ecommerce_mall_cancellation_request_snapshots.create({
        data: {
          id: snapshotId,
          approved_at: toISOStringSafe(new Date()),
          rejected_at: null,
          created_at: toISOStringSafe(new Date()),
          title: "Cancellation Request Approved",
          body: "Cancellation request has been approved by the seller.",
          actor_type: "seller",
          created_by: props.seller.id,
          cancellationRequest: { connect: { id: props.id } },
        },
      });
      // Update associated order item to cancelled
      await tx.ecommerce_mall_order_items.update({
        where: { id: existing.ecommerce_mall_order_item_id },
        data: {
          status: "cancelled",
        },
      });
    } else if (props.body.status === "rejected") {
      await tx.ecommerce_mall_cancellation_request_snapshots.create({
        data: {
          id: snapshotId,
          approved_at: null,
          rejected_at: toISOStringSafe(new Date()),
          seller_rejection_reason: props.body.seller_rejection_reason ?? null,
          created_at: toISOStringSafe(new Date()),
          title: "Cancellation Request Rejected",
          body: `Cancellation request has been rejected: ${props.body.seller_rejection_reason}`,
          actor_type: "seller",
          created_by: props.seller.id,
          cancellationRequest: { connect: { id: props.id } },
        },
      });
    }
    return updatedRequest;
  });
  // Transform and return result
  const result =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.id },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(result);
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerCancellationRequestsId(props: {
//   seller: SellerPayload;
//   id: string & tags.Format<"uuid">;
//   body: IEcommerceMallCancellationRequest.IUpdate;
// }): Promise<IEcommerceMallCancellationRequest> {
//   await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallCancellationRequestTransformer.select(),
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------