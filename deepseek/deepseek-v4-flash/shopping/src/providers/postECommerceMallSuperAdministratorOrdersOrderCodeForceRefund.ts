import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallOrderItemAtSummaryTransformer } from "../transformers/ECommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSuperAdministratorOrdersOrderCodeForceRefund(props: {
  superAdministrator: SuperadministratorPayload;
  orderCode: string;
  body: IECommerceMallOrder.IForceRefundRequest;
}): Promise<IECommerceMallOrder.IForceRefundResponse> {
  // 1. Find the order by code
  const order = await MyGlobal.prisma.e_commerce_mall_orders.findUniqueOrThrow({
    where: { code: props.orderCode },
    select: { id: true },
  });
  // 2. Determine which order items to process
  const hasSpecificItems =
    props.body.orderItemIds !== undefined && props.body.orderItemIds.length > 0;
  const targetItems = hasSpecificItems
    ? await MyGlobal.prisma.e_commerce_mall_order_items.findMany({
        where: {
          id: { in: props.body.orderItemIds },
        },
        select: {
          id: true,
          e_commerce_mall_order_id: true,
          e_commerce_mall_product_variant_id: true,
          quantity: true,
          status: true,
        },
      })
    : await MyGlobal.prisma.e_commerce_mall_order_items.findMany({
        where: {
          e_commerce_mall_order_id: order.id,
        },
        select: {
          id: true,
          e_commerce_mall_order_id: true,
          e_commerce_mall_product_variant_id: true,
          quantity: true,
          status: true,
        },
      });
  // 3. Classify items into refundable and skippable
  const refundableIds: string[] = [];
  const skippableEntries: Array<{
    itemId: string;
    reason: string;
  }> = [];
  for (const item of targetItems) {
    if (hasSpecificItems && item.e_commerce_mall_order_id !== order.id) {
      skippableEntries.push({
        itemId: item.id,
        reason: "item does not belong to this order",
      });
    } else if (item.status === "cancelled" || item.status === "refunded") {
      skippableEntries.push({
        itemId: item.id,
        reason: "already in terminal state",
      });
    } else {
      refundableIds.push(item.id);
    }
  }
  // 4. Execute force-refund in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    for (const item of targetItems) {
      if (refundableIds.includes(item.id) === false) {
        continue;
      }
      await tx.e_commerce_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      await tx.e_commerce_mall_order_item_status_logs.create({
        data: {
          id: v4(),
          e_commerce_mall_order_item_id: item.id,
          from_status: item.status,
          to_status: "refunded",
          reason: "administrator_force_refund",
          created_at: now,
          updated_at: now,
        },
      });
      await tx.e_commerce_mall_inventory_records.create({
        data: {
          id: v4(),
          e_commerce_mall_product_variant_id:
            item.e_commerce_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: "force-refunded",
          created_at: now,
        },
      });
    }
  });
  // 5. Re-query refunded items with transformer
  const refundedRecords =
    refundableIds.length > 0
      ? await MyGlobal.prisma.e_commerce_mall_order_items.findMany({
          where: { id: { in: refundableIds } },
          ...ECommerceMallOrderItemAtSummaryTransformer.select(),
        })
      : [];
  const refundedItems = await ArrayUtil.asyncMap(refundedRecords, (r) =>
    ECommerceMallOrderItemAtSummaryTransformer.transform(r),
  );
  // 6. Build skipped items — query each skipped item with transformer
  const skippedItemIds = skippableEntries.map((e) => e.itemId);
  const skippedRecords =
    skippedItemIds.length > 0
      ? await MyGlobal.prisma.e_commerce_mall_order_items.findMany({
          where: { id: { in: skippedItemIds } },
          ...ECommerceMallOrderItemAtSummaryTransformer.select(),
        })
      : [];
  const skippedMap = new Map<
    string,
    ECommerceMallOrderItemAtSummaryTransformer.Payload
  >();
  for (const record of skippedRecords) {
    skippedMap.set(record.id, record);
  }
  const skippedItems: IECommerceMallOrder.IForceRefundSkippedItem[] = [];
  for (const entry of skippableEntries) {
    const record = skippedMap.get(entry.itemId);
    if (record !== undefined) {
      skippedItems.push({
        item: await ECommerceMallOrderItemAtSummaryTransformer.transform(
          record,
        ),
        reason: entry.reason,
      });
    }
  }
  return {
    refundedItems,
    skippedItems,
  };
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
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSuperAdministratorOrdersOrderCodeForceRefund(props: {
//   superAdministrator: SuperadministratorPayload;
//   orderCode: string;
//   body: IECommerceMallOrder.IForceRefundRequest;
// }): Promise<IECommerceMallOrder.IForceRefundResponse> {
//   return {
//     refundedItems: await ArrayUtil.asyncMap(..., (r) => ECommerceMallOrderItemAtSummaryTransformer.transform(r)),
//     skippedItems: ...,
//   };
// }
// ```
//--------------------------------------------------------------