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

export async function deleteMallPlatformSellerShipmentsShipmentIdItemsShipmentItemId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        status: true,
        shipmentItems: {
          select: {
            id: true,
          },
        },
      },
    });
  if (shipment.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    shipment.status === "shipped" ||
    shipment.status === "delivered" ||
    shipment.status === "cancelled"
  ) {
    throw new HttpException("Shipment is no longer editable", 409);
  }
  const shipmentItem = shipment.shipmentItems.find(
    (item) => item.id === props.shipmentItemId,
  );
  if (shipmentItem === undefined) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_shipment_items.delete({
      where: { id: props.shipmentItemId },
    });
    if (shipment.shipmentItems.length === 1) {
      await prisma.mall_platform_shipments.delete({
        where: { id: props.shipmentId },
      });
    }
  });
}
