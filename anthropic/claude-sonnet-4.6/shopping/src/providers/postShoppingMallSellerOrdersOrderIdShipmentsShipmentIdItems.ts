import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentItemTransformer } from "../transformers/ShoppingMallShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.ICreate;
}): Promise<IShoppingMallShipmentItem> {
  // 1. Validate shipment exists, is not deleted, belongs to order and seller
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment has been deleted", 404);
  }
  if (shipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Shipment does not belong to the specified order",
      400,
    );
  }
  if (shipment.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: shipment does not belong to authenticated seller",
      403,
    );
  }
  // 2. Validate each order item
  for (const orderItemId of props.body.orderItemIds) {
    const orderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
        where: { id: orderItemId },
        select: {
          id: true,
          shopping_mall_order_id: true,
          status: true,
          shipmentItem: { select: { id: true } },
          productVariant: {
            select: {
              product: {
                select: {
                  shopping_mall_seller_id: true,
                },
              },
            },
          },
        },
      });
    if (orderItem.shopping_mall_order_id !== props.orderId) {
      throw new HttpException(
        `Order item ${orderItemId} does not belong to the specified order`,
        400,
      );
    }
    if (orderItem.status !== "paid") {
      throw new HttpException(
        `Order item ${orderItemId} is not in paid status (current: ${orderItem.status})`,
        400,
      );
    }
    if (
      orderItem.productVariant.product.shopping_mall_seller_id !==
      props.seller.id
    ) {
      throw new HttpException(
        `Order item ${orderItemId} belongs to a different seller`,
        403,
      );
    }
    if (orderItem.shipmentItem !== null) {
      throw new HttpException(
        `Order item ${orderItemId} is already assigned to another shipment`,
        409,
      );
    }
  }
  // 3. Perform transaction: insert shipment items, update order item statuses, recalculate order status
  const now = new Date();
  const createdItemIds: string[] = [];
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const orderItemId of props.body.orderItemIds) {
      const newId = v4();
      createdItemIds.push(newId);
      await tx.shopping_mall_shipment_items.create({
        data: {
          id: newId,
          created_at: now,
          shipment: { connect: { id: props.shipmentId } },
          orderItem: { connect: { id: orderItemId } },
        },
      });
      await tx.shopping_mall_order_items.update({
        where: { id: orderItemId },
        data: { status: "shipped", updated_at: now },
      });
    }
    // Recalculate order aggregate status
    const allItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { status: true },
    });
    const statuses = allItems.map((item) => item.status);
    const uniqueStatuses = [...new Set(statuses)];
    const aggregateStatus =
      uniqueStatuses.length === 1
        ? (uniqueStatuses[0] ?? "partially_completed")
        : "partially_completed";
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: { status: aggregateStatus, updated_at: now },
    });
  });
  // 4. Fetch and return the first created shipment item
  const firstCreatedId = createdItemIds[0];
  if (firstCreatedId === undefined) {
    throw new HttpException("No shipment items were created", 500);
  }
  const created =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUniqueOrThrow({
      where: { id: firstCreatedId },
      ...ShoppingMallShipmentItemTransformer.select(),
    });
  return ShoppingMallShipmentItemTransformer.transform(created);
}
