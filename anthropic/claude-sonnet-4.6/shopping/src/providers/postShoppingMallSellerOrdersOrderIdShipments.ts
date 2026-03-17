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
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentCollector } from "../collectors/ShoppingMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // Step 1: Validate order exists
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // Step 2: Fetch all requested order items and verify they belong to this order
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
      shopping_mall_order_id: props.orderId,
    },
    select: {
      id: true,
      status: true,
      productVariant: {
        select: {
          product: {
            select: {
              shopping_mall_seller_id: true,
            },
          },
        },
      },
      shipmentItem: {
        select: { id: true },
      },
    },
  });
  // Verify all requested items were found in this order
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException(
      "One or more order items do not belong to the specified order",
      404,
    );
  }
  // Step 3: Seller ownership check — every item must belong to this seller
  const hasUnauthorizedItem = orderItems.some(
    (item) =>
      item.productVariant.product.shopping_mall_seller_id !== props.seller.id,
  );
  if (hasUnauthorizedItem) {
    throw new HttpException(
      "One or more order items belong to a different seller",
      403,
    );
  }
  // Step 4: Status check — all items must have 'paid' status
  const hasNonPaidItem = orderItems.some((item) => item.status !== "paid");
  if (hasNonPaidItem) {
    throw new HttpException(
      "All order items must have 'paid' status to be included in a shipment",
      422,
    );
  }
  // Step 5: Duplicate assignment check — no item may already be in a shipment
  const hasAlreadyAssignedItem = orderItems.some(
    (item) => item.shipmentItem !== null,
  );
  if (hasAlreadyAssignedItem) {
    throw new HttpException(
      "One or more order items are already assigned to a shipment",
      409,
    );
  }
  // Step 6: Build shipment CreateInput via collector
  const shipmentData = await ShoppingMallShipmentCollector.collect({
    body: props.body,
    shoppingMallOrders: { id: props.orderId },
    shoppingMallSellers: { id: props.seller.id },
    shoppingMallSellerSessions: { id: props.seller.session_id },
  });
  // Step 7: Execute everything in a transaction and capture the created shipment id
  const now = new Date();
  const createdShipmentId = await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Create shipment with nested shipment items
    const created = await tx.shopping_mall_shipments.create({
      data: shipmentData,
      select: { id: true },
    });
    // b. Update each selected order item status to 'shipped'
    await tx.shopping_mall_order_items.updateMany({
      where: { id: { in: props.body.orderItemIds } },
      data: { status: "shipped", updated_at: now },
    });
    // c. Recalculate and update the parent order's derived status
    const allOrderItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { status: true },
    });
    const statuses = allOrderItems.map((i) => i.status);
    const uniqueStatuses = [...new Set(statuses)];
    const derivedStatus: string =
      uniqueStatuses.length === 1
        ? (uniqueStatuses[0] ?? "shipped")
        : statuses.every(
              (s) => s === "delivered" || s === "cancelled" || s === "refunded",
            )
          ? "partially_completed"
          : statuses.some((s) => s === "shipped")
            ? "shipped"
            : "partially_completed";
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: { status: derivedStatus, updated_at: now },
    });
    return created.id;
  });
  // Step 8: Fetch and transform the created shipment for response
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: createdShipmentId },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return ShoppingMallShipmentTransformer.transform(shipment);
}
