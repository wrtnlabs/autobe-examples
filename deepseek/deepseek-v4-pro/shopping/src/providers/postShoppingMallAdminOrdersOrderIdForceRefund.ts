import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrdersOrderIdForceRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  // Step 1: Find the order with its items and existing refund requests
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      code: true,
      status: true,
      orderItems: {
        select: {
          id: true,
          status: true,
          quantity: true,
          shopping_mall_product_variant_id: true,
          refundRequests: {
            select: {
              id: true,
              status: true,
              reason: true,
            },
            where: { deleted_at: null },
          },
        },
      },
    },
  });
  // Step 2: Validate the order has items
  if (order.orderItems.length === 0) {
    throw new HttpException("Order has no items", 404);
  }
  // Step 3: Idempotency — if all items are already refunded, return as-is
  const allAlreadyRefunded: boolean = order.orderItems.every(
    (item) => item.status === "refunded",
  );
  if (allAlreadyRefunded) {
    const existing =
      await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
        where: { id: props.orderId },
        ...ShoppingMallOrderTransformer.select(),
      });
    return await ShoppingMallOrderTransformer.transform(existing);
  }
  // Step 4: Resolve seller IDs through the FK chain
  //   orderItem → productVariant → product → seller
  const variantIds: string[] = order.orderItems.map(
    (item) => item.shopping_mall_product_variant_id,
  );
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        product: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  const variantSellerMap: Record<string, string> = {};
  for (const v of variants) {
    variantSellerMap[v.id] = v.product.shopping_mall_seller_id;
  }
  // Step 5: Process all items in a single transaction
  const now: string = new Date().toISOString();
  const previousOrderStatus: string = order.status;
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const item of order.orderItems) {
      // Skip items that are already in the terminal "refunded" state
      if (item.status === "refunded") {
        continue;
      }
      // --- 5a. Resolve refund request ---
      const existingRefundRequest =
        item.refundRequests.length > 0 ? item.refundRequests[0] : null;
      let refundRequestId: string;
      if (existingRefundRequest !== null) {
        refundRequestId = existingRefundRequest.id;
        await tx.shopping_mall_refund_requests.update({
          where: { id: existingRefundRequest.id },
          data: {
            status: "approved",
            responded_at: now,
            updated_at: now,
          },
        });
      } else {
        const newId: string = v4();
        refundRequestId = newId;
        await tx.shopping_mall_refund_requests.create({
          data: {
            id: newId,
            shopping_mall_order_item_id: item.id,
            reason: "Administrator force-refund",
            status: "approved",
            responded_at: now,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }
      // --- 5b. Create immutable snapshot ---
      const sellerId: string =
        variantSellerMap[item.shopping_mall_product_variant_id];
      const reasonText: string =
        existingRefundRequest !== null
          ? existingRefundRequest.reason
          : "Administrator force-refund";
      await tx.shopping_mall_refund_request_snapshots.create({
        data: {
          id: v4(),
          shopping_mall_refund_request_id: refundRequestId,
          seller_id: sellerId,
          reason: reasonText,
          status: "approved",
          created_at: now,
        },
      });
      // --- 5c. Update order item status ---
      await tx.shopping_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // --- 5d. Create positive inventory record ---
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            item.shopping_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: `Administrator force-refund for order ${order.code}`,
          created_at: now,
        },
      });
    }
    // --- 5e. Record the action in the audit log ---
    await tx.shopping_mall_admin_audit_logs.create({
      data: {
        id: v4(),
        shopping_mall_admin_id: props.admin.id,
        action_type: "force_refund_order",
        target_entity_type: "order",
        target_entity_id: props.orderId,
        old_value: previousOrderStatus,
        new_value: null,
        reason: null,
        created_at: now,
      },
    });
    // --- 5f. Recalculate order status ---
    const updatedItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { status: true },
    });
    const allRefunded: boolean = updatedItems.every(
      (item) => item.status === "refunded",
    );
    const derivedOrderStatus: string = allRefunded
      ? "refunded"
      : "partially_completed";
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: derivedOrderStatus,
        updated_at: now,
      },
    });
  });
  // Step 6: Fetch and return the fully transformed order
  const updated = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(updated);
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
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
// import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
// import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
// import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
// import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
// import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdminOrdersOrderIdForceRefund(props: {
//   admin: AdminPayload;
//   orderId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallOrder> {
//   const record = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
//     ...ShoppingMallOrderTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------