import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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

export async function putEcommerceMallSellerRefundRequestsId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IUpdate;
}): Promise<IEcommerceMallRefundRequest> {
  // Validate refund request exists and is in pending status
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.id },
      select: { id: true, status: true, order_item_id: true, updated_at: true },
    });
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not in pending status", 400);
  }
  // Verify seller owns the order item by checking product variant ownership
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.order_item_id },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        productVariant: {
          select: {
            id: true,
            product: { select: { seller: { select: { id: true } } } },
          },
        },
        status: true,
        quantity: true,
      },
    });
  if (orderItem.productVariant.product.seller.id !== props.seller.id) {
    throw new HttpException("You are not the seller of this item", 403);
  }
  // Execute all updates in a transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the refund request with seller response
    await tx.ecommerce_mall_refund_requests.update({
      where: { id: props.id },
      data: {
        status: props.body.status,
        updated_at: new Date(),
        ...(props.body.status === "approved"
          ? { approved_by_seller_id: props.seller.id }
          : { rejected_by_seller_id: props.seller.id }),
      },
    });
    // If approved, update order item status and restore stock
    if (props.body.status === "approved") {
      // Update order item status to refunded
      await tx.ecommerce_mall_order_items.update({
        where: { id: orderItem.id },
        data: { status: "refunded" },
      });
      // Create inventory record for stock restoration (refund return)
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          ecommerce_mall_product_variant_id: orderItem.productVariant.id,
          quantity_change: orderItem.quantity,
          operation_type: "REFUND_RETURN",
          reference_id: orderItem.id,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
      // Check if all items in the order are refunded and update order status if needed
      const allOrderItems = await tx.ecommerce_mall_order_items.findMany({
        where: { ecommerce_mall_order_id: orderItem.ecommerce_mall_order_id },
        select: { status: true },
      });
      const allRefunded = allOrderItems.every(
        (item) => item.status === "refunded",
      );
      if (allRefunded) {
        await tx.ecommerce_mall_orders.update({
          where: { id: orderItem.ecommerce_mall_order_id },
          data: { status: "refunded" },
        });
      }
    }
  });
  // Fetch updated refund request with full details
  const updated =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.id },
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerRefundRequestsId(props: {
//   seller: SellerPayload;
//   id: string & tags.Format<"uuid">;
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