import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentItemTransformer } from "../transformers/MallPlatformShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerShipmentsShipmentIdItemsShipmentItemId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.IUpdate;
}): Promise<IMallPlatformShipmentItem> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        deleted_at: true,
      },
    });
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const shipmentItem =
    await MyGlobal.prisma.mall_platform_shipment_items.findUniqueOrThrow({
      where: { id: props.shipmentItemId },
      select: {
        id: true,
        mall_platform_shipment_id: true,
        mall_platform_order_item_id: true,
        deleted_at: true,
      },
    });
  if (shipmentItem.deleted_at !== null) {
    throw new HttpException("Shipment item not found", 404);
  }
  if (shipmentItem.mall_platform_shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Shipment item does not belong to the specified shipment",
      409,
    );
  }
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: shipmentItem.mall_platform_order_item_id },
      select: {
        id: true,
        mall_platform_seller_id: true,
        deleted_at: true,
      },
    });
  if (orderItem.deleted_at !== null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Order item does not belong to the seller", 409);
  }
  const existingAssignment =
    await MyGlobal.prisma.mall_platform_shipment_items.findFirst({
      where: {
        mall_platform_order_item_id: shipmentItem.mall_platform_order_item_id,
        deleted_at: null,
        NOT: {
          id: props.shipmentItemId,
        },
      },
      select: {
        id: true,
      },
    });
  if (existingAssignment !== null) {
    throw new HttpException(
      "The order item is already assigned to another shipment",
      409,
    );
  }
  await MyGlobal.prisma.mall_platform_shipment_items.update({
    where: { id: props.shipmentItemId },
    data: {
      updated_at: new Date().toISOString() ? new Date() : new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_shipment_items.findUniqueOrThrow({
      where: { id: props.shipmentItemId },
      ...MallPlatformShipmentItemTransformer.select(),
    });
  return await MallPlatformShipmentItemTransformer.transform(updated);
}
