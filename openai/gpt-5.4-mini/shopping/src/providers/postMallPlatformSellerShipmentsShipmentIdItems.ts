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
import { MallPlatformShipmentItemCollector } from "../collectors/MallPlatformShipmentItemCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.ICreate;
}): Promise<IMallPlatformShipment> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment is not available", 400);
  }
  if (shipment.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (shipment.status !== "preparing") {
    throw new HttpException("Shipment is immutable", 400);
  }
  const orderItem = await MyGlobal.prisma.mall_platform_order_items.findFirst({
    where: {
      id: props.body.orderItemId,
      deleted_at: null,
    },
    select: {
      id: true,
      mall_platform_seller_id: true,
      status: true,
      shipmentItem: {
        select: {
          id: true,
          deleted_at: true,
        },
      },
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Cannot mix sellers in one shipment", 400);
  }
  if (orderItem.status !== "paid") {
    throw new HttpException("Order item is not shippable", 400);
  }
  if (
    orderItem.shipmentItem !== null &&
    orderItem.shipmentItem.deleted_at === null
  ) {
    throw new HttpException(
      "Order item is already assigned to a shipment",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.mall_platform_shipment_items.create({
      data: await MallPlatformShipmentItemCollector.collect({
        body: props.body,
        shipment: { id: props.shipmentId },
      }),
    });
    await tx.mall_platform_order_items.update({
      where: {
        id: props.body.orderItemId,
      },
      data: {
        status: "shipped",
        updated_at: props.body.orderItemId ? new Date() : new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      ...MallPlatformShipmentTransformer.select(),
    });
  return await MallPlatformShipmentTransformer.transform(updated);
}
