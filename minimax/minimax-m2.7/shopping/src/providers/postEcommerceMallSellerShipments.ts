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
import { EcommerceMallShipmentCollector } from "../collectors/EcommerceMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceMallShipment.ICreate;
}): Promise<IEcommerceMallShipment> {
  const sellerId = props.seller.id;
  const { orderId, carrier, trackingNumber, itemIds } = props.body;
  // Query all order items by itemIds with product ownership info
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: itemIds },
    },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      status: true,
      productVariant: {
        select: {
          product: {
            select: {
              ecommerce_mall_seller_id: true,
            },
          },
        },
      },
    },
  });
  // Verify all order items exist
  if (orderItems.length !== itemIds.length) {
    throw new HttpException("One or more order items not found", 400);
  }
  // Verify all order items belong to the same order
  const firstOrderId = orderItems[0].ecommerce_mall_order_id;
  const targetOrderId = orderId ?? firstOrderId;
  for (const item of orderItems) {
    if (item.ecommerce_mall_order_id !== targetOrderId) {
      throw new HttpException(
        "All order items must belong to the same order",
        400,
      );
    }
  }
  // Verify all order items have "paid" status
  for (const item of orderItems) {
    if (item.status !== "paid") {
      throw new HttpException(
        "All order items must have 'paid' status to create shipment",
        400,
      );
    }
  }
  // Verify seller owns all products in the order items
  for (const item of orderItems) {
    const productSellerId =
      item.productVariant.product.ecommerce_mall_seller_id;
    if (productSellerId !== sellerId) {
      throw new HttpException(
        "You can only ship items that belong to your products",
        403,
      );
    }
  }
  // Fetch seller entity
  const sellerRecord =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: sellerId },
      select: { id: true },
    });
  // Fetch order entity
  const orderRecord =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: targetOrderId },
      select: { id: true },
    });
  // Create shipment with transaction
  const shipment = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create shipment using collector
    const shipmentData = await EcommerceMallShipmentCollector.collect({
      body: props.body,
      ecommerceMallSellers: sellerRecord,
      ecommerceMallOrders: orderRecord,
      ecommerceMallOrderItems: orderItems,
    });
    // Create the shipment
    const createdShipment = await tx.ecommerce_mall_shipments.create({
      data: shipmentData,
    });
    // Update order items status to "shipped"
    await tx.ecommerce_mall_order_items.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: {
        status: "shipped",
        updated_at: new Date(),
      },
    });
    return createdShipment;
  });
  // Fetch created shipment with all relations for response
  const shipmentWithRelations =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: shipment.id },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(
    shipmentWithRelations,
  );
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
// export async function postEcommerceMallSellerShipments(props: {
//   seller: SellerPayload;
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