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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentDeliveryTransformer } from "../transformers/EcommerceMallShipmentDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminShipmentsShipmentIdDelivery(props: {
  admin: AdminPayload;
  shipmentId: string;
}): Promise<IEcommerceMallShipmentDelivery> {
  // Verify shipment exists
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Check if already delivered
  const existingDelivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUnique({
      where: { shipment_id: props.shipmentId },
    });
  if (existingDelivery !== null) {
    throw new HttpException("Shipment already delivered", 409);
  }
  const now = new Date();
  // Create delivery record
  const delivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.create({
      data: {
        id: v4(),
        shipment_id: props.shipmentId,
        customer_id: null,
        delivered_at: now,
        is_auto_delivered: false,
        created_at: now,
        updated_at: now,
      },
    });
  // Get all order items in this shipment
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: { shipment_id: props.shipmentId },
      select: { order_item_id: true },
    });
  const orderItemIds = shipmentItems.map((item) => item.order_item_id);
  // Update all order items status to 'delivered'
  if (orderItemIds.length > 0) {
    await MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
      where: { id: { in: orderItemIds } },
      data: { status: "delivered", updated_at: now },
    });
  }
  // Fetch and return with transformer
  const result =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUniqueOrThrow({
      where: { id: delivery.id },
      ...EcommerceMallShipmentDeliveryTransformer.select(),
    });
  return await EcommerceMallShipmentDeliveryTransformer.transform(result);
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
// export async function putEcommerceMallAdminShipmentsShipmentIdDelivery(props: {
//   admin: AdminPayload;
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