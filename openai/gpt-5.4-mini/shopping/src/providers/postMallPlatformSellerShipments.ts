import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformShipmentCollector } from "../collectors/MallPlatformShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerShipments(props: {
  seller: SellerPayload;
  body: IMallPlatformShipment.ICreate;
}): Promise<IMallPlatformShipment> {
  if (props.body.carrierName.trim().length === 0)
    throw new HttpException("Carrier name is required", 400);
  if (props.body.trackingNumber.trim().length === 0)
    throw new HttpException("Tracking number is required", 400);
  if (props.body.orderItemIds.length === 0)
    throw new HttpException("At least one order item is required", 400);
  const uniqueOrderItemIds = [...new Set(props.body.orderItemIds)];
  if (uniqueOrderItemIds.length !== props.body.orderItemIds.length)
    throw new HttpException("Duplicate order item IDs are not allowed", 400);
  const orderItems = await MyGlobal.prisma.mall_platform_order_items.findMany({
    where: {
      id: { in: uniqueOrderItemIds },
    },
    select: {
      id: true,
      status: true,
      mall_platform_order_id: true,
      mall_platform_seller_id: true,
      shipmentItem: {
        select: {
          id: true,
        },
      },
    },
  });
  if (orderItems.length !== uniqueOrderItemIds.length)
    throw new HttpException("One or more order items were not found", 404);
  const orderId = orderItems[0].mall_platform_order_id;
  for (const orderItem of orderItems) {
    if (orderItem.mall_platform_seller_id !== props.seller.id)
      throw new HttpException("You can only ship your own order items", 403);
    if (orderItem.mall_platform_order_id !== orderId)
      throw new HttpException(
        "All selected items must belong to the same order",
        400,
      );
    if (orderItem.status !== "paid" && orderItem.status !== "delivered")
      throw new HttpException("One or more order items are not shippable", 400);
    if (orderItem.shipmentItem !== null)
      throw new HttpException(
        "One or more order items already belong to a shipment",
        400,
      );
  }
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const shipment = await prisma.mall_platform_shipments.create({
      data: await MallPlatformShipmentCollector.collect({
        body: props.body,
        seller: props.seller,
        order: { id: orderId },
      }),
      ...MallPlatformShipmentTransformer.select(),
    });
    const now = toISOStringSafe(new Date());
    await prisma.mall_platform_shipment_items.createMany({
      data: uniqueOrderItemIds.map((orderItemId) => ({
        id: v4(),
        mall_platform_shipment_id: shipment.id,
        mall_platform_order_item_id: orderItemId,
        created_at: now,
        updated_at: now,
      })),
    });
    await prisma.mall_platform_order_items.updateMany({
      where: {
        id: { in: uniqueOrderItemIds },
      },
      data: {
        status: "shipped",
      },
    });
    return shipment;
  });
  return await MallPlatformShipmentTransformer.transform(created);
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
// import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformSellerShipments(props: {
//   seller: SellerPayload;
//   body: IMallPlatformShipment.ICreate;
// }): Promise<IMallPlatformShipment> {
//   const record = await MyGlobal.prisma.mall_platform_shipments.create({
//     data: await MallPlatformShipmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformShipmentTransformer.select(),
//   });
//   return await MallPlatformShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------