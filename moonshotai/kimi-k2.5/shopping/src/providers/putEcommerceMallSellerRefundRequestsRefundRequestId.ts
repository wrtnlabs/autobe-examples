import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IUpdate;
}): Promise<IEcommerceMallRefundRequest> {
  // Find refund request and verify ownership
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        seller_id: true,
        status: true,
        reason: true,
        order_item_id: true,
      },
    });
  // Verify seller owns this refund request
  if (refundRequest.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify refund request is still pending
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request has already been processed", 400);
  }
  const now = new Date();
  // Execute all operations atomically
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update refund request status and response timestamp
    await tx.ecommerce_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: props.body.status,
        responded_at: now,
        updated_at: now,
      },
    });
    // Create immutable snapshot for audit trail
    await tx.ecommerce_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        refund_request_id: props.refundRequestId,
        reason: refundRequest.reason,
        status: props.body.status,
        response_reason: props.body.responseReason ?? null,
        created_at: now,
      },
    });
    // If approved, update order item and restore inventory
    if (props.body.status === "approved") {
      // Get order item details for inventory restoration
      const orderItem = await tx.ecommerce_mall_order_items.findUniqueOrThrow({
        where: { id: refundRequest.order_item_id },
        select: {
          id: true,
          variant_id: true,
          quantity: true,
        },
      });
      // Update order item status to refunded
      await tx.ecommerce_mall_order_items.update({
        where: { id: refundRequest.order_item_id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // Create inventory record to restore stock quantity
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          product_variant_id: orderItem.variant_id,
          quantity_change: orderItem.quantity,
          reason: "Refund Restoration",
          created_at: now,
        },
      });
    }
  });
  // Fetch updated refund request with all relations and transform
  const updated =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  return await EcommerceMallRefundRequestTransformer.transform(updated);
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
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerRefundRequestsRefundRequestId(props: {
//   seller: SellerPayload;
//   refundRequestId: string;
//   body: IEcommerceMallRefundRequest.IUpdate;
// }): Promise<IEcommerceMallRefundRequest> {
//   await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallRefundRequestTransformer.select(),
//   });
//   return await EcommerceMallRefundRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------