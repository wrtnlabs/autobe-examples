import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerItemsItemId(props: {
  seller: SellerPayload;
  itemId: string;
  body: IEcommerceMallOrderItem.IUpdate;
}): Promise<IEcommerceMallOrderItem> {
  // Find order item and verify seller ownership
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        seller_id: props.seller.id,
      },
      select: {
        id: true,
        status: true,
        variant_id: true,
        quantity: true,
      },
    });
  // If status update requested, validate transition
  if (props.body.status !== undefined) {
    const currentStatus: string = orderItem.status;
    const newStatus: string = props.body.status;
    // Validate allowed transitions
    const allowedTransitions: Record<string, string[]> = {
      paid: ["cancelled"],
      delivered: ["refunded"],
    };
    const allowedStatuses: string[] = allowedTransitions[currentStatus] ?? [];
    if (!allowedStatuses.includes(newStatus)) {
      throw new HttpException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
        400,
      );
    }
    // For cancelled or refunded status, restore stock
    if (newStatus === "cancelled" || newStatus === "refunded") {
      const now: string & tags.Format<"date-time"> = new Date().toISOString();
      await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          product_variant_id: orderItem.variant_id,
          quantity_change: orderItem.quantity,
          reason: `order_${newStatus}`,
          created_at: now,
        },
      });
    }
    // Update order item status
    const updateTime: string & tags.Format<"date-time"> =
      new Date().toISOString();
    await MyGlobal.prisma.ecommerce_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: newStatus,
        updated_at: updateTime,
      },
    });
  }
  // Return updated order item using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  return EcommerceMallOrderItemTransformer.transform(updated);
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
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerItemsItemId(props: {
//   seller: SellerPayload;
//   itemId: string;
//   body: IEcommerceMallOrderItem.IUpdate;
// }): Promise<IEcommerceMallOrderItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
//     ...EcommerceMallOrderItemTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------