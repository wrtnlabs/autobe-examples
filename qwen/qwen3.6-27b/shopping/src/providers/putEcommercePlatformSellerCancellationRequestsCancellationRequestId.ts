import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformCancellationRequestTransformer } from "../transformers/EcommercePlatformCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommercePlatformCancellationRequest.IUpdate;
}): Promise<IEcommercePlatformCancellationRequest> {
  // Step 1: Fetch current cancellation request to validate status and collect needed data
  const current =
    await MyGlobal.prisma.ecommerce_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          status: true,
          reason: true,
          seller_response_reason: true,
          ecommerce_platform_order_item_id: true,
        },
      },
    );
  // Step 2: Validate the request is in 'pending' status
  if (current.status !== "pending") {
    throw new HttpException(
      "Cancellation request must be in 'pending' status to be updated",
      409,
    );
  }
  // Step 3: Extract and validate the new status from request body
  const newStatus = props.body.status;
  if (newStatus === undefined || newStatus === null) {
    throw new HttpException("Status update is required", 400);
  }
  if (newStatus !== "approved" && newStatus !== "rejected") {
    throw new HttpException("Status must be 'approved' or 'rejected'", 400);
  }
  // Step 4: Execute all changes atomically in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the cancellation request
    await tx.ecommerce_platform_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: newStatus,
        ...(props.body.seller_response_reason !== undefined && {
          seller_response_reason: props.body.seller_response_reason,
        }),
        updated_at: new Date(),
      },
    });
    // Handle downstream effects for approval
    if (newStatus === "approved") {
      // Fetch the order item to get product variant info for inventory restoration
      const orderItem =
        await tx.ecommerce_platform_order_items.findUniqueOrThrow({
          where: { id: current.ecommerce_platform_order_item_id },
          select: {
            id: true,
            quantity: true,
            ecommerce_platform_product_variant_id: true,
          },
        });
      // Update order item status to 'cancelled'
      await tx.ecommerce_platform_order_items.update({
        where: { id: orderItem.id },
        data: {
          status: "cancelled",
          updated_at: new Date(),
        },
      });
      // Restore inventory by creating a positive stock adjustment record
      await tx.ecommerce_platform_inventory_records.create({
        data: {
          id: v4(),
          ecommerce_platform_product_variant_id:
            orderItem.ecommerce_platform_product_variant_id,
          quantity_delta: orderItem.quantity,
          reason: `Cancellation request ${current.id} approved`,
          created_at: new Date(),
        },
      });
      // Create snapshot parent record
      const snapshotId = v4();
      await tx.ecommerce_platform_snapshots.create({
        data: {
          id: snapshotId,
          entity_type: "cancellation_request",
          created_at: new Date(),
        },
      });
      // Create subtype snapshot record for audit trail
      await tx.ecommerce_platform_snapshot_cancellation_requests.create({
        data: {
          id: v4(),
          ecommerce_platform_snapshot_id: snapshotId,
          ecommerce_platform_cancellation_request_id: current.id,
          previous_reason: current.reason,
          current_reason: current.reason,
          previous_status: current.status,
          current_status: newStatus,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
  });
  // Step 6: Fetch and return the updated cancellation request
  const updated =
    await MyGlobal.prisma.ecommerce_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...EcommercePlatformCancellationRequestTransformer.select(),
      },
    );
  return await EcommercePlatformCancellationRequestTransformer.transform(
    updated,
  );
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
// import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommercePlatformSellerCancellationRequestsCancellationRequestId(props: {
//   seller: SellerPayload;
//   cancellationRequestId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformCancellationRequest.IUpdate;
// }): Promise<IEcommercePlatformCancellationRequest> {
//   await MyGlobal.prisma.ecommerce_platform_cancellation_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_cancellation_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformCancellationRequestTransformer.select(),
//   });
//   return await EcommercePlatformCancellationRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------