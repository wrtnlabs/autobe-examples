import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformShipmentCollector } from "../collectors/MallPlatformShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerShipments(props: {
  seller: SellerPayload;
  body: IMallPlatformShipment.ICreate;
}): Promise<IMallPlatformShipment> {
  const order = await MyGlobal.prisma.mall_platform_orders.findUniqueOrThrow({
    where: {
      id: props.body.mallPlatformOrderId,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (order.deleted_at !== null) {
    throw new HttpException("Order is not available.", 400);
  }
  const shipmentItemIds = props.body.shipmentItems.map(
    (item) => item.orderItemId,
  );
  const uniqueShipmentItemIds = Array.from(new Set(shipmentItemIds));
  if (uniqueShipmentItemIds.length !== shipmentItemIds.length) {
    throw new HttpException(
      "Duplicate order items are not allowed in one shipment.",
      400,
    );
  }
  const orderItems = await MyGlobal.prisma.mall_platform_order_items.findMany({
    where: {
      id: { in: uniqueShipmentItemIds },
      mall_platform_order_id: props.body.mallPlatformOrderId,
      deleted_at: null,
    },
    select: {
      id: true,
      mall_platform_order_id: true,
      mall_platform_seller_id: true,
      status: true,
    },
  });
  if (orderItems.length !== uniqueShipmentItemIds.length) {
    throw new HttpException("One or more order items were not found.", 404);
  }
  if (
    orderItems.some((item) => item.mall_platform_seller_id !== props.seller.id)
  ) {
    throw new HttpException(
      "Shipment items must belong to the authenticated seller.",
      403,
    );
  }
  if (
    Array.from(new Set(orderItems.map((item) => item.mall_platform_order_id)))
      .length !== 1
  ) {
    throw new HttpException("Shipment items must belong to one order.", 400);
  }
  if (
    orderItems.some(
      (item) =>
        item.status !== "ready_for_shipping" &&
        item.status !== "paid" &&
        item.status !== "delivered",
    )
  ) {
    throw new HttpException(
      "One or more items are not eligible for shipping.",
      409,
    );
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const shipment = await tx.mall_platform_shipments.create({
      data: await MallPlatformShipmentCollector.collect({
        body: props.body,
        seller: props.seller,
      }),
      ...MallPlatformShipmentTransformer.select(),
    });
    await tx.mall_platform_order_items.updateMany({
      where: {
        id: { in: uniqueShipmentItemIds },
        mall_platform_order_id: props.body.mallPlatformOrderId,
        mall_platform_seller_id: props.seller.id,
      },
      data: {
        status: "shipped",
      },
    });
    return shipment;
  });
  return await MallPlatformShipmentTransformer.transform(created);
}
