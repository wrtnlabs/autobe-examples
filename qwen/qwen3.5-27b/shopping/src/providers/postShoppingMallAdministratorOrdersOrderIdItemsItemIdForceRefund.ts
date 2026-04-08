import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorOrdersOrderIdItemsItemIdForceRefund(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const now = new Date();
  // Step 1: Find the order item and verify it belongs to the order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      quantity: true,
      shopping_mall_product_variant_id: true,
      status: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Step 2: Check if already refunded
  if (orderItem.status === "refunded") {
    throw new HttpException("Order item is already refunded", 409);
  }
  // Step 3: Get order number for audit log and inventory reason
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: {
      order_number: true,
    },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  // Step 4: Begin transaction and perform all operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 5: Update order item status to refunded
    await tx.shopping_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
    // Step 6: Create inventory record to restore stock
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          orderItem.shopping_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: `Force-refund for order ${order.order_number}`,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Step 7: Update order's updated_at timestamp
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        updated_at: now,
      },
    });
    // Step 8: Create administrator audit log
    await tx.shopping_mall_administrator_audit_logs.create({
      data: {
        id: v4(),
        shopping_mall_administrator_id: props.administrator.id,
        action_type: "force_refund_order_item",
        target_type: "order_item",
        target_id: props.itemId,
        ip_address: "0.0.0.0",
        user_agent: null,
        created_at: now,
      },
    });
    // Step 9: Return the updated order item with full data
    return tx.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  });
  // Step 10: Transform and return the result
  return await ShoppingMallOrderItemTransformer.transform(result);
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
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
// import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdministratorOrdersOrderIdItemsItemIdForceRefund(props: {
//   administrator: AdministratorPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallOrderItem> {
//   const record = await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
//     ...ShoppingMallOrderItemTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------