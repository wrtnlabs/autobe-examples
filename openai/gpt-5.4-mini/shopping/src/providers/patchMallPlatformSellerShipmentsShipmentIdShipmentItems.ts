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
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentItemAtSummaryTransformer } from "../transformers/MallPlatformShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerShipmentsShipmentIdShipmentItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.IUpdate;
}): Promise<IPageIMallPlatformShipmentItem.ISummary> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        deleted_at: true,
      },
    });
  if (shipment.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    shipment.deleted_at !== null ||
    shipment.status !== "preparing" ||
    shipment.shipped_at !== null ||
    shipment.delivered_at !== null
  ) {
    throw new HttpException("Shipment is unavailable", 400);
  }
  const requestedOrderItemIds = props.body.orderItemIds;
  const requestedItems =
    await MyGlobal.prisma.mall_platform_order_items.findMany({
      where: {
        id: { in: requestedOrderItemIds },
        mall_platform_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
        status: true,
      },
    });
  if (requestedItems.length !== requestedOrderItemIds.length) {
    throw new HttpException("One or more order items are invalid", 400);
  }
  for (const item of requestedItems) {
    if (item.mall_platform_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (item.status === "cancelled" || item.status === "refunded") {
      throw new HttpException("Order item is not ship-ready", 400);
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_shipment_items.deleteMany({
      where: {
        mall_platform_shipment_id: props.shipmentId,
        mall_platform_order_item_id: { notIn: requestedOrderItemIds },
      },
    });
    const toCreate = requestedOrderItemIds.map((orderItemId) => ({
      id: v4(),
      mall_platform_shipment_id: props.shipmentId,
      mall_platform_order_item_id: orderItemId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    }));
    if (toCreate.length > 0) {
      await prisma.mall_platform_shipment_items.createMany({
        data: toCreate,
      });
    }
    await prisma.mall_platform_shipments.update({
      where: { id: props.shipmentId },
      data: { updated_at: new Date() },
    });
  });
  const records = await MyGlobal.prisma.mall_platform_shipment_items.findMany({
    where: { mall_platform_shipment_id: props.shipmentId, deleted_at: null },
    orderBy: { created_at: "asc" },
    ...MallPlatformShipmentItemAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: 1,
      limit: records.length,
      records: records.length,
      pages: records.length === 0 ? 0 : 1,
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformShipmentItemAtSummaryTransformer.transform,
    ),
  };
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
// import { IPageIMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipmentItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
// export async function patchMallPlatformSellerShipmentsShipmentIdShipmentItems(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IMallPlatformShipmentItem.IUpdate;
// }): Promise<IPageIMallPlatformShipmentItem.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_shipment_items.findMany({
//     ...MallPlatformShipmentItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformShipmentItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------