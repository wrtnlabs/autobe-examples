import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformShipmentItemTransformer } from "../transformers/MallPlatformShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAdministratorShipmentsShipmentIdItems(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.ICreate;
}): Promise<IMallPlatformShipmentItem> {
  await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
    where: { id: props.administrator.id },
    select: { id: true, deleted_at: true },
  });
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        deleted_at: true,
      },
    });
  if (shipment.deleted_at !== null)
    throw new HttpException("Shipment is not available.", 409);
  const orderItemIds = props.body.orderItemIds;
  if (new Set(orderItemIds).size !== orderItemIds.length)
    throw new HttpException(
      "Duplicate order item identifiers are not allowed.",
      409,
    );
  const orderItems = await MyGlobal.prisma.mall_platform_order_items.findMany({
    where: {
      id: { in: orderItemIds },
      deleted_at: null,
    },
    select: {
      id: true,
      mall_platform_seller_id: true,
      status: true,
    },
  });
  if (orderItems.length !== orderItemIds.length)
    throw new HttpException("One or more order items were not found.", 404);
  if (
    orderItems.some(
      (item) =>
        item.mall_platform_seller_id !== shipment.mall_platform_seller_id,
    )
  )
    throw new HttpException(
      "Order items must belong to the same seller as the shipment.",
      409,
    );
  if (
    orderItems.some(
      (item) =>
        item.status !== "paid" &&
        item.status !== "ready" &&
        item.status !== "shipped",
    )
  )
    throw new HttpException(
      "One or more order items are not eligible for shipping.",
      409,
    );
  const existingAssignments =
    await MyGlobal.prisma.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_order_item_id: { in: orderItemIds },
        deleted_at: null,
      },
      select: { mall_platform_order_item_id: true },
    });
  if (existingAssignments.length !== 0)
    throw new HttpException(
      "One or more order items are already assigned to a shipment.",
      409,
    );
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_shipment_items.createMany({
      data: orderItemIds.map((orderItemId) => ({
        id: v4(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
        mall_platform_shipment_id: props.shipmentId,
        mall_platform_order_item_id: orderItemId,
      })),
    });
    await prisma.mall_platform_order_items.updateMany({
      where: {
        id: { in: orderItemIds },
        deleted_at: null,
      },
      data: {
        status: "shipped",
      },
    });
  });
  const records = await MyGlobal.prisma.mall_platform_shipment_items.findMany({
    where: {
      mall_platform_shipment_id: props.shipmentId,
      mall_platform_order_item_id: { in: orderItemIds },
      deleted_at: null,
    },
    ...MallPlatformShipmentItemTransformer.select(),
  });
  if (records.length !== 1)
    throw new HttpException(
      "Exactly one shipment item record was expected.",
      409,
    );
  return await MallPlatformShipmentItemTransformer.transform(records[0]);
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAdministratorShipmentsShipmentIdItems(props: {
//   administrator: AdministratorPayload;
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