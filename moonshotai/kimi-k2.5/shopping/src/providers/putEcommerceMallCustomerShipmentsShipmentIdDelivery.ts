import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentDeliveryTransformer } from "../transformers/EcommerceMallShipmentDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerShipmentsShipmentIdDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string;
}): Promise<IEcommerceMallShipmentDelivery> {
  // 1. Fetch shipment with order to verify ownership
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      order: {
        select: {
          customer_id: true,
        },
      },
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // 2. Verify customer owns the order
  if (shipment.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check if already delivered
  const existingDelivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUnique({
      where: { shipment_id: props.shipmentId },
    });
  if (existingDelivery !== null) {
    throw new HttpException("Shipment already delivered", 409);
  }
  // 4. Atomic transaction: create delivery + update order items
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create delivery record
    const now = new Date();
    await tx.ecommerce_mall_shipment_deliveries.create({
      data: {
        id: v4(),
        shipment_id: props.shipmentId,
        customer_id: props.customer.id,
        delivered_at: now,
        is_auto_delivered: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Find all order items in this shipment
    const shipmentItems = await tx.ecommerce_mall_shipment_items.findMany({
      where: { shipment_id: props.shipmentId },
      select: { order_item_id: true },
    });
    const orderItemIds = shipmentItems.map((si) => si.order_item_id);
    // Update all order items to delivered status
    if (orderItemIds.length > 0) {
      await tx.ecommerce_mall_order_items.updateMany({
        where: {
          id: { in: orderItemIds },
        },
        data: {
          status: "delivered",
          updated_at: now,
        },
      });
    }
  });
  // 5. Fetch and return the created delivery record
  const delivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUniqueOrThrow({
      where: { shipment_id: props.shipmentId },
      ...EcommerceMallShipmentDeliveryTransformer.select(),
    });
  return await EcommerceMallShipmentDeliveryTransformer.transform(delivery);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallCustomerShipmentsShipmentIdDelivery(props: {
//   customer: CustomerPayload;
//   shipmentId: string;
// }): Promise<IEcommerceMallShipmentDelivery> {
//   await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallShipmentDeliveryTransformer.select(),
//   });
//   return await EcommerceMallShipmentDeliveryTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------