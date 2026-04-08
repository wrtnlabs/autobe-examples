import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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

export async function postEcommerceMallSellerCancellationRequestsRequestIdApprove(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  // Fetch cancellation request with order item details
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_mall_order_item_id: true,
        ecommerce_mall_seller_id: true,
        ecommerce_mall_customer_id: true,
        reason: true,
        status: true,
        created_at: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            ecommerce_mall_product_variant_id: true,
            status: true,
          },
        },
      },
    });
  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Validate seller owns the order item
  if (cancellationRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate request is in pending status
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been processed",
      400,
    );
  }
  const now: Date = new Date();
  // Execute atomic transaction
  await MyGlobal.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const snapshotId: string = v4();
    const refundId: string = v4();
    const inventoryId: string = v4();
    // Update cancellation request to approved
    await tx.ecommerce_mall_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        updated_at: now,
      },
    });
    // Create cancellation request snapshot
    await tx.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: snapshotId,
        ecommerce_mall_cancellation_request_id: props.requestId,
        reason: cancellationRequest.reason,
        status: "approved",
        created_at: now,
      },
    });
    // Update order item to cancelled
    await tx.ecommerce_mall_order_items.update({
      where: { id: cancellationRequest.ecommerce_mall_order_item_id },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
    // Create inventory record to restore stock
    await tx.ecommerce_mall_inventory_records.create({
      data: {
        id: inventoryId,
        ecommerce_mall_product_variant_id:
          cancellationRequest.orderItem.ecommerce_mall_product_variant_id,
        quantity_change: cancellationRequest.orderItem.quantity,
        reason: "cancellation",
        created_at: now,
      },
    });
    // Create refund request to initiate refund processing
    await tx.ecommerce_mall_refund_requests.create({
      data: {
        id: refundId,
        ecommerce_mall_order_item_id:
          cancellationRequest.ecommerce_mall_order_item_id,
        ecommerce_mall_customer_id:
          cancellationRequest.ecommerce_mall_customer_id,
        ecommerce_mall_seller_id: props.seller.id,
        reason: cancellationRequest.reason,
        status: "pending",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
  // Query and return the created snapshot
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow(
      {
        where: {
          ecommerce_mall_cancellation_request_id: props.requestId,
        },
        orderBy: {
          created_at: "desc",
        },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(snapshot);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerCancellationRequestsRequestIdApprove(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCancellationRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallCancellationRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------