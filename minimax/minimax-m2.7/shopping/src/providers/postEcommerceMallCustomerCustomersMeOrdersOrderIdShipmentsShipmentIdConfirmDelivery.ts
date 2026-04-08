import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersMeOrdersOrderIdShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment> {
  // Query shipment with order and shipmentItems to validate ownership and current state
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      order: {
        select: {
          id: true,
          ecommerce_mall_customer_id: true,
        },
      },
      shipmentItems: {
        select: {
          id: true,
          ecommerce_mall_order_item_id: true,
        },
      },
    },
  });
  // Check shipment exists
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Check shipment belongs to the specified order
  if (shipment.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Shipment does not belong to the specified order",
      404,
    );
  }
  // Check customer owns the order
  if (shipment.order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check shipment has items
  if (shipment.shipmentItems.length === 0) {
    throw new HttpException("Shipment contains no order items", 400);
  }
  // Get the order item IDs to update
  const orderItemIds = shipment.shipmentItems.map(
    (item) => item.ecommerce_mall_order_item_id,
  );
  // Verify all items are in 'shipped' status before updating
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: orderItemIds },
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Check all items are in 'shipped' status
  const allShipped = orderItems.every((item) => item.status === "shipped");
  if (!allShipped) {
    throw new HttpException(
      "All items in the shipment must be in 'shipped' status to confirm delivery",
      400,
    );
  }
  // Update all order items to 'delivered' status within a transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: orderItemIds },
        status: "shipped",
      },
      data: {
        status: "delivered",
        updated_at: new Date(),
      },
    }),
  ]);
  // Fetch the updated shipment with full data for response
  const updatedShipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(updatedShipment);
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
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersMeOrdersOrderIdShipmentsShipmentIdConfirmDelivery(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShipment> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
//     ...EcommerceMallShipmentTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------