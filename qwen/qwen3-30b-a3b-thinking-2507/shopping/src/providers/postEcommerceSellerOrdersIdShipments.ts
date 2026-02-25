import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceShipmentCollector } from "../collectors/EcommerceShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceShipmentTransformer } from "../transformers/EcommerceShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerOrdersIdShipments(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceShipment.ICreate;
}): Promise<IEcommerceShipment> {
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.id },
  });
  const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: {
      order_id: props.id,
    },
  });
  if (!orderItems.every((item) => item.seller_id === props.seller.id)) {
    throw new HttpException("Order doesn't belong to this seller", 403);
  }
  const existingShipment = await MyGlobal.prisma.ecommerce_shipments.findFirst({
    where: {
      ecommerce_order_id: props.id,
      status: { not: "cancelled" },
    },
  });
  if (existingShipment) {
    throw new HttpException("Shipment already created for this order", 400);
  }
  const shipmentData = await EcommerceShipmentCollector.collect({
    body: props.body,
    ecommerceOrders: { id: props.id },
  });
  shipmentData.status = "shipped";
  const createdShipment = await MyGlobal.prisma.ecommerce_shipments.create({
    data: shipmentData,
    include: {
      order: true,
      shipmentItems: true,
    },
  });
  if (orderItems.length > 0) {
    await MyGlobal.prisma.ecommerce_shipment_items.createMany({
      data: orderItems.map((item) => ({
        id: v4(),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
        shipment_id: createdShipment.id,
        order_item_id: item.id,
      })),
    });
    await MyGlobal.prisma.ecommerce_order_items.updateMany({
      where: {
        id: { in: orderItems.map((item) => item.id) },
      },
      data: { status: "shipped" },
    });
  }
  return await EcommerceShipmentTransformer.transform(createdShipment);
}
