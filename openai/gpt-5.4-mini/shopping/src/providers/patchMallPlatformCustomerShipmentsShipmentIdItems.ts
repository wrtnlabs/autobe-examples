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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerShipmentsShipmentIdItems(props: {
  customer: CustomerPayload;
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
        order: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  if (shipment.order.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const requestedIds = Array.from(new Set(props.body.orderItemIds));
  if (requestedIds.length === 0) {
    throw new HttpException(
      "Shipment must contain at least one order item.",
      400,
    );
  }
  const orderItems = await MyGlobal.prisma.mall_platform_order_items.findMany({
    where: {
      id: { in: requestedIds },
    },
    select: {
      id: true,
      mall_platform_order_id: true,
      mall_platform_seller_id: true,
      status: true,
    },
  });
  if (orderItems.length !== requestedIds.length) {
    throw new HttpException("One or more order items are invalid.", 400);
  }
  for (const item of orderItems) {
    if (item.mall_platform_order_id !== shipment.mall_platform_order_id) {
      throw new HttpException(
        "Order items must belong to the same order as the shipment.",
        400,
      );
    }
    if (item.mall_platform_seller_id !== shipment.mall_platform_seller_id) {
      throw new HttpException(
        "Order items must belong to the same seller as the shipment.",
        400,
      );
    }
    if (
      item.status !== "pending" &&
      item.status !== "ready" &&
      item.status !== "confirmed"
    ) {
      throw new HttpException(
        "One or more order items are not eligible for shipment.",
        400,
      );
    }
  }
  const existingLinks =
    await MyGlobal.prisma.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_shipment_id: props.shipmentId,
      },
      select: {
        mall_platform_order_item_id: true,
      },
    });
  const existingSet = new Set(
    existingLinks.map((link) => link.mall_platform_order_item_id),
  );
  await MyGlobal.prisma.$transaction(async (tx) => {
    const conflictingLinks = await tx.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_order_item_id: { in: requestedIds },
        mall_platform_shipment_id: { not: props.shipmentId },
      },
      select: {
        id: true,
      },
    });
    if (conflictingLinks.length > 0) {
      throw new HttpException(
        "One or more order items are already assigned to another shipment.",
        400,
      );
    }
    await tx.mall_platform_shipment_items.deleteMany({
      where: {
        mall_platform_shipment_id: props.shipmentId,
        mall_platform_order_item_id: { notIn: requestedIds },
      },
    });
    const missingIds = requestedIds.filter((id) => !existingSet.has(id));
    if (missingIds.length > 0) {
      const now = toISOStringSafe(new Date());
      await tx.mall_platform_shipment_items.createMany({
        data: missingIds.map((orderItemId) => ({
          id: v4(),
          mall_platform_shipment_id: props.shipmentId,
          mall_platform_order_item_id: orderItemId,
          created_at: now,
          updated_at: now,
        })),
      });
    }
  });
  const record = await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow(
    {
      ...MallPlatformShipmentTransformer.select(),
      where: {
        id: props.shipmentId,
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
// export async function patchMallPlatformCustomerShipmentsShipmentIdItems(props: {
//   customer: CustomerPayload;
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