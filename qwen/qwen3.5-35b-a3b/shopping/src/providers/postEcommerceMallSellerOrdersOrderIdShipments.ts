import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallShipmentCollector } from "../collectors/EcommerceMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      ecommerce_mall_order_id: props.orderId,
      item_status: "paid",
    },
  });
  const selectedItems = await ArrayUtil.asyncMap(
    props.body.order_items,
    async (item) => {
      const matchingOrderItem = orderItems.find(
        (oi) =>
          oi.ecommerce_mall_product_id === item.product_id &&
          oi.ecommerce_mall_product_variant_id === item.variant_id,
      );
      if (!matchingOrderItem) {
        throw new HttpException(
          `Order item not found for product ${item.product_id} and variant ${item.variant_id}`,
          400,
        );
      }
      return matchingOrderItem;
    },
  );
  if (selectedItems.length === 0) {
    throw new HttpException("No order items provided", 400);
  }
  const firstSellerId = selectedItems[0]!.seller_profile_snapshot
    ? JSON.parse(selectedItems[0]!.seller_profile_snapshot).id
    : "";
  const differentSellerItems = selectedItems.filter((item) => {
    const itemSellerId = item.seller_profile_snapshot
      ? JSON.parse(item.seller_profile_snapshot).id
      : "";
    return itemSellerId !== firstSellerId;
  });
  if (differentSellerItems.length > 0) {
    throw new HttpException(
      "Cannot include order items from different sellers in one shipment",
      400,
    );
  }
  if (firstSellerId !== props.seller.id) {
    throw new HttpException(
      "Order items do not belong to the authenticated seller",
      400,
    );
  }
  if (!props.body.carrier_name || props.body.carrier_name.trim().length === 0) {
    throw new HttpException("Carrier name is required", 400);
  }
  if (
    !props.body.tracking_number ||
    props.body.tracking_number.trim().length === 0
  ) {
    throw new HttpException("Tracking number is required", 400);
  }
  const collectorResult = await EcommerceMallShipmentCollector.collect({
    body: props.body,
    ecommerceMallOrders: order,
    ecommerceMallSellers: { id: props.seller.id } as IEntity,
  });
  const created = await MyGlobal.prisma.ecommerce_mall_shipments.create({
    data: collectorResult,
  });
  await MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
    where: {
      id: {
        in: selectedItems.map((item) => item.id),
      },
    },
    data: {
      item_status: "shipped",
    },
  });
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: created.id },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(shipment);
}
