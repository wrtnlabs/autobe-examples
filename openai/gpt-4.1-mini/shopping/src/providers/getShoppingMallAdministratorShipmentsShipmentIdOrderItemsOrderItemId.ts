import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorShipmentsShipmentIdOrderItemsOrderItemId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentOrderItem> {
  const record =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findUnique({
      where: {
        shopping_mall_shipment_id_shopping_mall_order_item_id: {
          shopping_mall_shipment_id: props.shipmentId,
          shopping_mall_order_item_id: props.orderItemId,
        },
      },
      include: {
        orderItem: {
          include: {
            productVariant: true,
          },
        },
        shipment: true,
      },
    });
  if (!record) {
    throw new HttpException("Shipment order item not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_shipment_id: record.shopping_mall_shipment_id as string &
      tags.Format<"uuid">,
    shopping_mall_order_item_id: record.shopping_mall_order_item_id as string &
      tags.Format<"uuid">,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    shipment: {
      id: record.shipment.id,
      created_at: toISOStringSafe(record.shipment.created_at),
      updated_at: toISOStringSafe(record.shipment.updated_at),
      deleted_at: record.shipment.deleted_at
        ? toISOStringSafe(record.shipment.deleted_at)
        : null,
      status: record.shipment.status,
      seller_id: record.shipment.seller_id,
    },
    orderItem: {
      id: record.orderItem.id,
      created_at: toISOStringSafe(record.orderItem.created_at),
      updated_at: toISOStringSafe(record.orderItem.updated_at),
      deleted_at: record.orderItem.deleted_at
        ? toISOStringSafe(record.orderItem.deleted_at)
        : null,
      shopping_mall_order_id: record.orderItem
        .shopping_mall_order_id as string & tags.Format<"uuid">,
      shopping_mall_product_variant_id: record.orderItem
        .shopping_mall_product_variant_id as string & tags.Format<"uuid">,
      quantity: record.orderItem.quantity,
      status: record.orderItem.status,
      productVariant: record.orderItem.productVariant,
    },
  };
}
