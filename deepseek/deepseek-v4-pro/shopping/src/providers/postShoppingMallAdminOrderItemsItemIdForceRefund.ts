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
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrderItemsItemIdForceRefund(props: {
  admin: AdminPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow(
    {
      where: { id: props.itemId },
      select: {
        id: true,
        status: true,
        quantity: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        productVariant: {
          select: {
            id: true,
            product: {
              select: {
                shopping_mall_seller_id: true,
              },
            },
          },
        },
      },
    },
  );
  const previousStatus: string = item.status;
  const alreadyRefunded: boolean = previousStatus === "refunded";
  const now: string = new Date().toISOString();
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      status: "refunded",
      updated_at: now,
    },
  });
  if (!alreadyRefunded) {
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant: { connect: { id: item.shopping_mall_product_variant_id } },
        quantity_change: item.quantity,
        reason: "administrator force-refund",
        created_at: now,
      },
    });
  }
  const refundRequestId: string = v4();
  await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: {
      id: refundRequestId,
      orderItem: { connect: { id: props.itemId } },
      reason: "administrator force-refund",
      status: "approved",
      responded_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.shopping_mall_refund_request_snapshots.create({
    data: {
      id: v4(),
      refundRequest: { connect: { id: refundRequestId } },
      seller: {
        connect: { id: item.productVariant.product.shopping_mall_seller_id },
      },
      reason: "administrator force-refund",
      status: "approved",
      created_at: now,
    },
  });
  const allItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: item.shopping_mall_order_id },
    select: { status: true },
  });
  const statuses: string[] = allItems.map((i) => i.status);
  let orderStatus: string;
  if (statuses.every((s: string): boolean => s === "paid")) {
    orderStatus = "paid";
  } else if (
    statuses.some((s: string): boolean => s === "shipped") &&
    statuses.every((s: string): boolean => s === "paid" || s === "shipped")
  ) {
    orderStatus = "shipped";
  } else if (statuses.every((s: string): boolean => s === "delivered")) {
    orderStatus = "delivered";
  } else if (statuses.every((s: string): boolean => s === "cancelled")) {
    orderStatus = "cancelled";
  } else if (statuses.every((s: string): boolean => s === "refunded")) {
    orderStatus = "refunded";
  } else {
    orderStatus = "partially_completed";
  }
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: item.shopping_mall_order_id },
    data: {
      status: orderStatus,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      admin: { connect: { id: props.admin.id } },
      action_type: "force_refund_order_item",
      target_entity_type: "order_item",
      target_entity_id: props.itemId,
      old_value: previousStatus,
      new_value: "refunded",
      reason: "administrator force-refund",
      created_at: now,
    },
  });
  const result =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
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
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
// export async function postShoppingMallAdminOrderItemsItemIdForceRefund(props: {
//   admin: AdminPayload;
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