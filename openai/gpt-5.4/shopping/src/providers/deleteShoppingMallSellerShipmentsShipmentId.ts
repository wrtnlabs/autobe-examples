import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        delivered_at: true,
        trackingInfo: {
          select: {
            id: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            status: true,
            delivered_at: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    });
  if (shipment.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (shipment.delivered_at !== null) {
    throw new HttpException("Conflict", 409);
  }
  if (
    shipment.orderItems.some(
      (item) =>
        item.status === "shipped" ||
        item.status === "delivered" ||
        item.delivered_at !== null,
    )
  ) {
    throw new HttpException("Conflict", 409);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_order_items.updateMany({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
      },
      data: {
        shopping_mall_shipment_id: null,
        updated_at: new Date(),
      },
    });
    if (shipment.trackingInfo !== null) {
      await prisma.shopping_mall_tracking_infos.delete({
        where: {
          id: shipment.trackingInfo.id,
        },
      });
    }
    await prisma.shopping_mall_shipments.delete({
      where: {
        id: props.shipmentId,
      },
    });
  });
}
