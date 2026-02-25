import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentConfirmationCollector } from "../collectors/ShoppingMallShipmentConfirmationCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentConfirmationTransformer } from "../transformers/ShoppingMallShipmentConfirmationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerShipmentConfirmations(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipmentConfirmation.ICreate;
}): Promise<IShoppingMallShipmentConfirmation> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.body.shoppingMallShipmentId,
      deleted_at: null,
    },
  });
  if (!shipment) {
    throw new HttpException(
      "Invalid shipment ID or shipment does not exist",
      403,
    );
  }
  const shipmentOrderItemLinks =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findMany({
      where: { shopping_mall_shipment_id: shipment.id },
      select: { shopping_mall_order_item_id: true },
    });
  const orderItemIds = shipmentOrderItemLinks.map(
    (link) => link.shopping_mall_order_item_id,
  );
  if (orderItemIds.length === 0) {
    throw new HttpException("No order items linked to this shipment", 403);
  }
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { id: { in: orderItemIds } },
    select: { id: true, shopping_mall_order_id: true },
  });
  if (orderItems.length === 0) {
    throw new HttpException(
      "No valid order items found for this shipment",
      403,
    );
  }
  const orderIds = Array.from(
    new Set(orderItems.map((item) => item.shopping_mall_order_id)),
  );
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      id: { in: orderIds },
      shopping_mall_customer_id: props.customer.id,
    },
    select: { id: true },
  });
  if (orders.length === 0) {
    throw new HttpException(
      "You are not authorized to confirm this shipment",
      403,
    );
  }
  const createData = await ShoppingMallShipmentConfirmationCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.create({
      data: createData,
      ...ShoppingMallShipmentConfirmationTransformer.select(),
    });
  return await ShoppingMallShipmentConfirmationTransformer.transform(created);
}
