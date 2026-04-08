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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorShipmentsShipmentIdItems(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipment.IUpdateItem;
}): Promise<IMallPlatformShipment> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
        mall_platform_order_id: true,
        deleted_at: true,
      },
    });
  const requestedOrderItemIds = Array.from(new Set(props.body.orderItemIds));
  if (requestedOrderItemIds.length === 0) {
    throw new HttpException(
      "Shipment must contain at least one order item.",
      400,
    );
  }
  const currentShipmentItems =
    await MyGlobal.prisma.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_shipment_id: shipment.id,
      },
      select: {
        mall_platform_order_item_id: true,
      },
    });
  const currentOrderItemIds = currentShipmentItems.map(
    (item) => item.mall_platform_order_item_id,
  );
  const currentOrderItemIdSet = new Set(currentOrderItemIds);
  const requestedOrderItemIdSet = new Set(requestedOrderItemIds);
  const requestedOrderItems =
    await MyGlobal.prisma.mall_platform_order_items.findMany({
      where: {
        id: {
          in: requestedOrderItemIds,
        },
      },
      select: {
        id: true,
        mall_platform_order_id: true,
        mall_platform_seller_id: true,
        status: true,
      },
    });
  if (requestedOrderItems.length !== requestedOrderItemIds.length) {
    throw new HttpException("Some requested order items do not exist.", 400);
  }
  const requestedOrderItemMap = new Map(
    requestedOrderItems.map((item) => [item.id, item]),
  );
  const conflictingShipmentItems =
    await MyGlobal.prisma.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_order_item_id: {
          in: requestedOrderItemIds,
        },
        mall_platform_shipment_id: {
          not: shipment.id,
        },
      },
      select: {
        mall_platform_order_item_id: true,
      },
    });
  if (conflictingShipmentItems.length > 0) {
    throw new HttpException(
      "One or more requested order items already belong to another shipment.",
      400,
    );
  }
  for (const orderItemId of requestedOrderItemIds) {
    const orderItem = requestedOrderItemMap.get(orderItemId);
    if (
      orderItem === undefined ||
      orderItem.mall_platform_order_id !== shipment.mall_platform_order_id
    ) {
      throw new HttpException("Order item belongs to a different order.", 400);
    }
    if (
      orderItem.mall_platform_seller_id !== shipment.mall_platform_seller_id
    ) {
      throw new HttpException("Order item belongs to a different seller.", 400);
    }
    if (
      orderItem.status !== "ready" &&
      orderItem.status !== "paid" &&
      orderItem.status !== "pending"
    ) {
      throw new HttpException("Order item is not eligible for shipment.", 400);
    }
  }
  const itemsToRemove = currentOrderItemIds.filter(
    (id) => !requestedOrderItemIdSet.has(id),
  );
  const itemsToAdd = requestedOrderItemIds.filter(
    (id) => !currentOrderItemIdSet.has(id),
  );
  await MyGlobal.prisma.$transaction(async (trx) => {
    if (itemsToRemove.length > 0) {
      await trx.mall_platform_shipment_items.deleteMany({
        where: {
          mall_platform_shipment_id: shipment.id,
          mall_platform_order_item_id: {
            in: itemsToRemove,
          },
        },
      });
    }
    if (itemsToAdd.length > 0) {
      await trx.mall_platform_shipment_items.createMany({
        data: itemsToAdd.map((mallPlatformOrderItemId) => ({
          id: v4(),
          mall_platform_shipment_id: shipment.id,
          mall_platform_order_item_id: mallPlatformOrderItemId,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        })),
        skipDuplicates: false,
      });
    }
    const remainingCount = await trx.mall_platform_shipment_items.count({
      where: {
        mall_platform_shipment_id: shipment.id,
      },
    });
    if (remainingCount === 0) {
      throw new HttpException(
        "Shipment must contain at least one order item.",
        400,
      );
    }
  });
  const record = await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow(
    {
      ...MallPlatformShipmentTransformer.select(),
      where: {
        id: shipment.id,
        deleted_at: null,
      },
    },
  );
  return await MallPlatformShipmentTransformer.transform(record);
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
// export async function patchMallPlatformAdministratorShipmentsShipmentIdItems(props: {
//   administrator: AdministratorPayload;
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