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

export async function postShoppingMallAdministratorOrdersOrderIdItemsItemIdForceCancel(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IForceCancelRequest;
}): Promise<IShoppingMallOrderItem> {
  // Find the order item and verify it belongs to the specified order
  const record =
    await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
      ...ShoppingMallOrderItemTransformer.select(),
      where: {
        id: props.itemId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
    });
  // Validate item status - cannot force-cancel already cancelled or refunded items
  if (record.status === "cancelled" || record.status === "refunded") {
    throw new HttpException(
      `Order item is already ${record.status} and cannot be force-cancelled`,
      400,
    );
  }
  // Update order item status to cancelled
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      status: "cancelled",
      updated_at: new Date(),
    },
  });
  // Create inventory record to restore stock quantity
  await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data: {
      id: v4(),
      shopping_mall_product_variant_id: record.productVariant.id,
      quantity_change: record.quantity,
      reason: "Force-cancelled order item",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Create administrator audit log entry
  await MyGlobal.prisma.shopping_mall_administrator_audit_logs.create({
    data: {
      id: v4(),
      shopping_mall_administrator_id: props.administrator.id,
      action_type: "force_cancel_order_item",
      target_type: "order_item",
      target_id: props.itemId,
      ip_address: "unknown",
      user_agent: null,
      created_at: new Date(),
    },
  });
  // Return the updated order item
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      ...ShoppingMallOrderItemTransformer.select(),
      where: { id: props.itemId },
    });
  return await ShoppingMallOrderItemTransformer.transform(updated);
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
// export async function postShoppingMallAdministratorOrdersOrderIdItemsItemIdForceCancel(props: {
//   administrator: AdministratorPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallOrderItem.IForceCancelRequest;
// }): Promise<IShoppingMallOrderItem> {
//   const record = await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
//     ...ShoppingMallOrderItemTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------