import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  // Fetch all order items with seller info for validation
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
      ecommerce_mall_order_id: props.body.orderId,
    },
    select: {
      id: true,
      status: true,
      productSnapshot: {
        select: { ecommerce_mall_seller_id: true },
      },
    },
  });
  // Verify all order items exist
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException("One or more order items not found", 404);
  }
  // Verify all items have 'paid' status
  const hasUnpaidItems = orderItems.some((item) => item.status !== "paid");
  if (hasUnpaidItems) {
    throw new HttpException("All order items must have 'paid' status", 400);
  }
  // Verify all items belong to the authenticated seller
  const hasUnauthorizedItems = orderItems.some(
    (item) => item.productSnapshot.ecommerce_mall_seller_id !== props.seller.id,
  );
  if (hasUnauthorizedItems) {
    throw new HttpException("Order items do not belong to this seller", 403);
  }
  // Verify single seller rule - all items must be from same seller
  const uniqueSellerIds = new Set(
    orderItems.map((item) => item.productSnapshot.ecommerce_mall_seller_id),
  );
  if (uniqueSellerIds.size > 1) {
    throw new HttpException(
      "All items in shipment must belong to the same seller",
      400,
    );
  }
  // Check if any item is already in a shipment
  const existingShipmentItemsCount =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.count({
      where: {
        ecommerce_mall_order_item_id: { in: props.body.orderItemIds },
      },
    });
  if (existingShipmentItemsCount > 0) {
    throw new HttpException(
      "One or more order items are already in a shipment",
      400,
    );
  }
  // Create shipment and update statuses in transaction
  const shipmentId = v4();
  const now = new Date();
  const createdShipment = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create shipment record
    const shipment = await tx.ecommerce_mall_shipments.create({
      data: {
        id: shipmentId,
        ecommerce_mall_order_id: props.body.orderId,
        ecommerce_mall_seller_id: props.seller.id,
        carrier: props.body.carrier,
        tracking_number: props.body.trackingNumber,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        shipmentItems: {
          create: props.body.orderItemIds.map((orderItemId) => ({
            id: v4(),
            ecommerce_mall_order_item_id: orderItemId,
            created_at: now,
          })),
        },
      },
    });
    // Update order items status to 'shipped'
    await tx.ecommerce_mall_order_items.updateMany({
      where: { id: { in: props.body.orderItemIds } },
      data: {
        status: "shipped",
        updated_at: now,
      },
    });
    // Update order's updated_at timestamp
    await tx.ecommerce_mall_orders.update({
      where: { id: props.body.orderId },
      data: { updated_at: now },
    });
    return shipment;
  });
  // Fetch the complete shipment with all relations for response
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: createdShipment.id },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return EcommerceMallShipmentTransformer.transform(shipment);
}
