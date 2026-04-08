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

export async function putEcommerceMallSellerCancellationRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IUpdate;
}): Promise<IEcommerceMallCancellationRequest> {
  // Step 1: Fetch cancellation request by ID
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          ecommerce_mall_order_item_id: true,
          ecommerce_mall_seller_id: true,
          reason: true,
          status: true,
        },
      },
    );
  // Step 2: Verify seller ownership
  if (cancellationRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify status is 'pending'
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Request has already been processed", 409);
  }
  // Step 4: Validate body contains valid status
  const newStatus = props.body.status;
  if (newStatus !== "approved" && newStatus !== "rejected") {
    throw new HttpException("Invalid status value", 400);
  }
  // Step 5: Update cancellation request status
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
    where: { id: props.requestId },
    data: {
      status: newStatus,
      updated_at: new Date(),
    },
  });
  // Step 6: Create snapshot record preserving state at seller response time
  await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_cancellation_request_id: props.requestId,
      reason: cancellationRequest.reason,
      status: newStatus,
      created_at: new Date(),
    },
  });
  // Step 7: If approved, cancel order item and restore inventory
  if (newStatus === "approved") {
    // Find order item with variant info
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
        where: { id: cancellationRequest.ecommerce_mall_order_item_id },
        select: {
          id: true,
          ecommerce_mall_product_variant_id: true,
          quantity: true,
        },
      });
    // Update order item status to 'cancelled'
    await MyGlobal.prisma.ecommerce_mall_order_items.update({
      where: { id: orderItem.id },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
    // Create inventory record to restore stock (positive quantity_change)
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_mall_product_variant_id:
          orderItem.ecommerce_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: "order_cancellation",
        created_at: new Date(),
      },
    });
  }
  // Step 8: Fetch the latest snapshot and return using transformer
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow(
      {
        where: { ecommerce_mall_cancellation_request_id: props.requestId },
        orderBy: { created_at: "desc" },
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
// export async function putEcommerceMallSellerCancellationRequestsRequestId(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallCancellationRequest.IUpdate;
// }): Promise<IEcommerceMallCancellationRequest> {
//   await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallCancellationRequestTransformer.select(),
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------