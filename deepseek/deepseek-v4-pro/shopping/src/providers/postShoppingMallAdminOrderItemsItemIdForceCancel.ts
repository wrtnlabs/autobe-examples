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

export async function postShoppingMallAdminOrderItemsItemIdForceCancel(props: {
  admin: AdminPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IForceCancel;
}): Promise<IShoppingMallOrderItem> {
  const item =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        quantity: true,
        price: true,
        status: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
      },
    });
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.itemId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    const cancellationRequestId = existingRequest?.id ?? v4();
    if (existingRequest) {
      await tx.shopping_mall_cancellation_requests.update({
        where: { id: existingRequest.id },
        data: {
          status: "approved",
          reason: props.body.reason,
          updated_at: now,
        },
      });
    } else {
      await tx.shopping_mall_cancellation_requests.create({
        data: {
          id: cancellationRequestId,
          orderItem: { connect: { id: props.itemId } },
          reason: props.body.reason,
          status: "approved",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        cancellationRequest: { connect: { id: cancellationRequestId } },
        reason: `[Admin Force-Cancel by ${props.admin.id}] ${props.body.reason}`,
        status: "approved",
        created_at: now,
      },
    });
    await tx.shopping_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant: { connect: { id: item.shopping_mall_product_variant_id } },
        quantity_change: item.quantity,
        reason: `Administrator force-cancelled order item ${props.itemId}: ${props.body.reason}`,
        created_at: now,
      },
    });
    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: item.shopping_mall_order_id },
      select: { status: true },
    });
    const statuses = orderItems.map((oi) => oi.status);
    let orderStatus: string;
    if (statuses.every((s) => s === "paid")) {
      orderStatus = "paid";
    } else if (statuses.every((s) => s === "cancelled")) {
      orderStatus = "cancelled";
    } else if (statuses.every((s) => s === "refunded")) {
      orderStatus = "refunded";
    } else if (statuses.every((s) => s === "delivered")) {
      orderStatus = "delivered";
    } else if (
      statuses.some((s) => s === "shipped") &&
      statuses.every((s) => s !== "delivered")
    ) {
      orderStatus = "shipped";
    } else {
      orderStatus = "partially_completed";
    }
    await tx.shopping_mall_orders.update({
      where: { id: item.shopping_mall_order_id },
      data: {
        status: orderStatus,
        updated_at: now,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
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
// export async function postShoppingMallAdminOrderItemsItemIdForceCancel(props: {
//   admin: AdminPayload;
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallOrderItem.IForceCancel;
// }): Promise<IShoppingMallOrderItem> {
//   const record = await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
//     ...ShoppingMallOrderItemTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------