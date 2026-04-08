import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformShipmentItemCollector } from "../collectors/MallPlatformShipmentItemCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentItemTransformer } from "../transformers/MallPlatformShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerShipmentsShipmentIdShipmentItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.ICreate;
}): Promise<IMallPlatformShipmentItem> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        mall_platform_order_id: true,
        deleted_at: true,
      },
    });
  if (shipment.deleted_at !== null)
    throw new HttpException("Shipment not found", 404);
  if (shipment.mall_platform_seller_id !== props.seller.id)
    throw new HttpException("Forbidden", 403);
  const uniqueOrderItemIds = Array.from(new Set(props.body.orderItemIds));
  if (uniqueOrderItemIds.length === 0)
    throw new HttpException("At least one order item is required", 400);
  if (uniqueOrderItemIds.length !== props.body.orderItemIds.length)
    throw new HttpException("Duplicate order item ids are not allowed", 400);
  const orderItems = await MyGlobal.prisma.mall_platform_order_items.findMany({
    where: { id: { in: uniqueOrderItemIds } },
    select: {
      id: true,
      mall_platform_order_id: true,
      mall_platform_seller_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (orderItems.length !== uniqueOrderItemIds.length)
    throw new HttpException("Some order items were not found", 404);
  for (const orderItem of orderItems) {
    if (orderItem.deleted_at !== null)
      throw new HttpException(
        "Some order items are not eligible for shipping",
        400,
      );
    if (orderItem.mall_platform_order_id !== shipment.mall_platform_order_id)
      throw new HttpException(
        "Some order items do not belong to the shipment order",
        400,
      );
    if (orderItem.mall_platform_seller_id !== props.seller.id)
      throw new HttpException(
        "Some order items do not belong to the shipment seller",
        403,
      );
    if (orderItem.status !== "shippable")
      throw new HttpException(
        "Some order items are not eligible for shipping",
        400,
      );
  }
  const createdId = await MyGlobal.prisma.$transaction(async (tx) => {
    let firstCreatedId: string | null = null;
    for (const orderItem of orderItems) {
      const existing = await tx.mall_platform_shipment_items.findFirst({
        where: {
          mall_platform_order_item_id: orderItem.id,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (existing !== null)
        throw new HttpException(
          "Some order items are already assigned to another shipment",
          409,
        );
      const record = await tx.mall_platform_shipment_items.create({
        data: await MallPlatformShipmentItemCollector.collect({
          body: props.body,
          shipment,
          orderItem,
        }),
        select: { id: true },
      });
      if (firstCreatedId === null) firstCreatedId = record.id;
    }
    if (firstCreatedId === null)
      throw new HttpException("At least one order item is required", 400);
    return firstCreatedId;
  });
  const created =
    await MyGlobal.prisma.mall_platform_shipment_items.findUniqueOrThrow({
      where: { id: createdId },
      ...MallPlatformShipmentItemTransformer.select(),
    });
  return await MallPlatformShipmentItemTransformer.transform(created);
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
// import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
// import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformSellerShipmentsShipmentIdShipmentItems(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IMallPlatformShipmentItem.ICreate;
// }): Promise<IMallPlatformShipmentItem> {
//   const record = await MyGlobal.prisma.mall_platform_shipment_items.create({
//     data: await MallPlatformShipmentItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformShipmentItemTransformer.select(),
//   });
//   return await MallPlatformShipmentItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------