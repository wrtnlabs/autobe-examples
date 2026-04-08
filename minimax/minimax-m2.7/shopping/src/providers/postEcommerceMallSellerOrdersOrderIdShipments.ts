import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
  // 1. Validate order exists and belongs to the authenticated seller
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // 2. Query all provided order items
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
    },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      status: true,
    },
  });
  // 3. Validate all order items were found
  if (orderItems.length !== props.body.orderItemIds.length) {
    const foundIds = new Set(orderItems.map((item) => item.id));
    const missingIds = props.body.orderItemIds.filter(
      (id) => !foundIds.has(id),
    );
    throw new HttpException(
      `Order items not found: ${missingIds.join(", ")}`,
      404,
    );
  }
  // 4. Validate all items belong to the specified order
  const invalidOrderItems = orderItems.filter(
    (item) => item.ecommerce_mall_order_id !== props.orderId,
  );
  if (invalidOrderItems.length > 0) {
    throw new HttpException(
      `Order items do not belong to the specified order: ${invalidOrderItems.map((item) => item.id).join(", ")}`,
      400,
    );
  }
  // 5. Validate all items have 'paid' status
  const unpaidItems = orderItems.filter((item) => item.status !== "paid");
  if (unpaidItems.length > 0) {
    throw new HttpException(
      `Order items must have 'paid' status. Invalid items: ${unpaidItems.map((item) => item.id).join(", ")}`,
      400,
    );
  }
  // 6. Validate carrier is non-empty
  if (!props.body.carrier || props.body.carrier.trim().length === 0) {
    throw new HttpException("Carrier name is required", 400);
  }
  // 7. Validate tracking number is non-empty
  if (
    !props.body.trackingNumber ||
    props.body.trackingNumber.trim().length === 0
  ) {
    throw new HttpException("Tracking number is required", 400);
  }
  // 8. Create shipment using collector
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.create({
    data: await EcommerceMallShipmentCollector.collect({
      body: props.body,
      ecommerceMallOrders: { id: props.orderId },
      ecommerceMallSellers: { id: props.seller.id },
      ecommerceMallSellerSessions: { id: props.seller.session_id },
    }),
    ...EcommerceMallShipmentTransformer.select(),
  });
  // 9. Update order items status to 'shipped'
  await MyGlobal.prisma.ecommerce_mall_order_items.updateMany({
    where: {
      id: { in: props.body.orderItemIds },
    },
    data: {
      status: "shipped",
      updated_at: new Date(),
    },
  });
  // 10. Return transformed shipment
  return await EcommerceMallShipmentTransformer.transform(shipment);
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
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerOrdersOrderIdShipments(props: {
//   seller: SellerPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IEcommerceMallShipment.ICreate;
// }): Promise<IEcommerceMallShipment> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.create({
//     data: await EcommerceMallShipmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallShipmentTransformer.select(),
//   });
//   return await EcommerceMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------