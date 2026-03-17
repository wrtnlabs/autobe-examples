import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shipped_at: true,
        delivery_confirmed_at: true,
        deleted_at: true,
      },
    });
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment has been deleted", 404);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: shipment.shopping_mall_order_id },
    select: {
      id: true,
      customer_id: true,
      deleted_at: true,
    },
  });
  if (order.deleted_at !== null) {
    throw new HttpException("Order has been deleted", 404);
  }
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: You do not own this order", 403);
  }
  if (shipment.shipped_at === null) {
    throw new HttpException("Shipment has not been shipped yet", 400);
  }
  if (shipment.delivery_confirmed_at !== null) {
    throw new HttpException("Delivery already confirmed", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      delivery_confirmed_at: now,
      updated_at: now,
    },
  });
  const shipmentItems =
    await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: {
        shipment_id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        order_item_id: true,
      },
    });
  if (shipmentItems.length > 0) {
    await MyGlobal.prisma.shopping_mall_order_items.updateMany({
      where: {
        id: {
          in: shipmentItems.map((si) => si.order_item_id),
        },
      },
      data: {
        status: "DELIVERED",
        updated_at: now,
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return await ShoppingMallShipmentTransformer.transform(updated);
}
