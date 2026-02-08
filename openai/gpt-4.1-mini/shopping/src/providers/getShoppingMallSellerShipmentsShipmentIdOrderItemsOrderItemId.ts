import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
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

export async function getShoppingMallSellerShipmentsShipmentIdOrderItemsOrderItemId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentOrderItem> {
  const shipmentOrderItem =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findFirst({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
        shopping_mall_order_item_id: props.orderItemId,
        deleted_at: null,
        shipment: {
          deleted_at: null,
          seller_id: props.seller.id,
        },
        orderItem: {
          deleted_at: null,
        },
      },
      select: {
        id: true,
        shopping_mall_shipment_id: true,
        shopping_mall_order_item_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipment: {
          select: {
            seller_id: true,
            status: true,
          },
        },
        orderItem: {
          select: {
            status: true,
            quantity: true,
            shopping_mall_product_variant_id: true,
            productVariant: {
              select: {
                sku_code: true,
              },
            },
          },
        },
      },
    });
  if (shipmentOrderItem === null) {
    throw new HttpException(
      "Shipment order item not found or access forbidden",
      404,
    );
  }
  return {
    id: shipmentOrderItem.id,
    shipment_id: shipmentOrderItem.shopping_mall_shipment_id,
    order_item_id: shipmentOrderItem.shopping_mall_order_item_id,
    status: shipmentOrderItem.orderItem.status,
    quantity: shipmentOrderItem.orderItem.quantity,
    product_variant_id:
      shipmentOrderItem.orderItem.shopping_mall_product_variant_id,
    sku_code: shipmentOrderItem.orderItem.productVariant.sku_code,
    seller_id: shipmentOrderItem.shipment.seller_id,
    shipment_status: shipmentOrderItem.shipment.status,
    created_at: toISOStringSafe(shipmentOrderItem.created_at),
    updated_at: toISOStringSafe(shipmentOrderItem.updated_at),
    deleted_at: shipmentOrderItem.deleted_at
      ? toISOStringSafe(shipmentOrderItem.deleted_at)
      : null,
  };
}
