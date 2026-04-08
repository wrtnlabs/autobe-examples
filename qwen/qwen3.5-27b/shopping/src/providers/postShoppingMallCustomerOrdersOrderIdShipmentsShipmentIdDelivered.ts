import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function postShoppingMallCustomerOrdersOrderIdShipmentsShipmentIdDelivered(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  // Step 1: Verify order exists and customer owns it
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Verify shipment exists, belongs to order, and not already delivered
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        shopping_mall_order_id: props.orderId,
        delivered_at: null,
        deleted_at: null,
      },
      select: { id: true, shopping_mall_seller_id: true },
    });
  // Step 3: Get all order items from the shipment's seller in this order
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
      shopping_mall_seller_id: shipment.shopping_mall_seller_id,
      deleted_at: null,
    },
    select: { id: true, status: true },
  });
  // Verify all items are in 'shipped' status
  const hasNonShippedItems = orderItems.some(
    (item) => item.status !== "shipped",
  );
  if (hasNonShippedItems) {
    throw new HttpException("Order items must be in shipped status", 400);
  }
  // Step 4: Update shipment with delivered_at timestamp
  const updatedShipment = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      delivered_at: new Date(),
      updated_at: new Date(),
    },
    ...ShoppingMallShipmentTransformer.select(),
  });
  // Step 5: Update all order items from this seller to 'delivered' status
  await MyGlobal.prisma.shopping_mall_order_items.updateMany({
    where: {
      id: { in: orderItems.map((item) => item.id) },
    },
    data: {
      status: "delivered",
      updated_at: new Date(),
    },
  });
  // Step 6: Return transformed shipment
  return await ShoppingMallShipmentTransformer.transform(updatedShipment);
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
// import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerOrdersOrderIdShipmentsShipmentIdDelivered(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallShipment> {
//   const record = await MyGlobal.prisma.shopping_mall_shipments.findFirstOrThrow({
//     ...ShoppingMallShipmentTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------