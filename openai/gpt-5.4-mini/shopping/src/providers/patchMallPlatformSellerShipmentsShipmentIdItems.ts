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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipment.IUpdateItem;
}): Promise<IMallPlatformShipment> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        mall_platform_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
        mall_platform_order_id: true,
      },
    });
  const desiredIds = [...new Set(props.body.orderItemIds)];
  if (desiredIds.length === 0) {
    throw new HttpException(
      "A shipment must contain at least one order item",
      400,
    );
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const currentLinks = await tx.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_shipment_id: shipment.id,
        deleted_at: null,
      },
      select: {
        mall_platform_order_item_id: true,
      },
    });
    const requestedItems = await tx.mall_platform_order_items.findMany({
      where: {
        id: { in: desiredIds },
      },
      select: {
        id: true,
        mall_platform_order_id: true,
        mall_platform_seller_id: true,
        status: true,
        deleted_at: true,
      },
    });
    if (requestedItems.length !== desiredIds.length) {
      throw new HttpException("One or more order items were not found", 400);
    }
    for (const item of requestedItems) {
      if (item.deleted_at !== null) {
        throw new HttpException(
          "One or more order items are not available for shipment",
          400,
        );
      }
      if (item.mall_platform_order_id !== shipment.mall_platform_order_id) {
        throw new HttpException(
          "Order items must belong to the same order as the shipment",
          400,
        );
      }
      if (item.mall_platform_seller_id !== shipment.mall_platform_seller_id) {
        throw new HttpException(
          "Order items must belong to the shipment seller",
          400,
        );
      }
      if (
        item.status !== "paid" &&
        item.status !== "ready" &&
        item.status !== "pending"
      ) {
        throw new HttpException(
          "One or more order items are not shippable",
          400,
        );
      }
    }
    const alreadyAssigned = await tx.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_order_item_id: { in: desiredIds },
        deleted_at: null,
      },
      select: {
        mall_platform_order_item_id: true,
        mall_platform_shipment_id: true,
      },
    });
    for (const assigned of alreadyAssigned) {
      if (assigned.mall_platform_shipment_id !== shipment.id) {
        throw new HttpException(
          "One or more order items already belong to another shipment",
          400,
        );
      }
    }
    const currentIdSet = new Set(
      currentLinks.map((link) => link.mall_platform_order_item_id),
    );
    const desiredIdSet = new Set(desiredIds);
    const removeIds = currentLinks
      .filter((link) => !desiredIdSet.has(link.mall_platform_order_item_id))
      .map((link) => link.mall_platform_order_item_id);
    const addIds = desiredIds.filter((id) => !currentIdSet.has(id));
    if (removeIds.length > 0) {
      await tx.mall_platform_shipment_items.deleteMany({
        where: {
          mall_platform_shipment_id: shipment.id,
          mall_platform_order_item_id: { in: removeIds },
        },
      });
    }
    for (const orderItemId of addIds) {
      await tx.mall_platform_shipment_items.create({
        data: {
          id: v4(),
          mall_platform_shipment_id: shipment.id,
          mall_platform_order_item_id: orderItemId,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
    const record = await tx.mall_platform_shipments.findFirstOrThrow({
      ...MallPlatformShipmentTransformer.select(),
      where: {
        id: shipment.id,
        mall_platform_seller_id: shipment.mall_platform_seller_id,
        deleted_at: null,
      },
    });
    return await MallPlatformShipmentTransformer.transform(record);
  });
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
// export async function patchMallPlatformSellerShipmentsShipmentIdItems(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IMallPlatformShipment.IUpdateItem;
// }): Promise<IMallPlatformShipment> {
//   const record = await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow({
//     ...MallPlatformShipmentTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------