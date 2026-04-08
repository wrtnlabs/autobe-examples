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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformShipmentItemAtSummaryTransformer } from "../transformers/MallPlatformShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorShipmentsShipmentIdShipmentItems(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.IUpdate;
}): Promise<IPageIMallPlatformShipmentItem.ISummary> {
  const requestedIds = Array.from(new Set(props.body.orderItemIds));
  if (requestedIds.length === 0) {
    throw new HttpException("At least one order item is required.", 400);
  }
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        status: true,
        mall_platform_seller_id: true,
      },
    });
  if (shipment.status !== "preparing") {
    throw new HttpException("Shipment is unavailable.", 409);
  }
  const orderItems = await MyGlobal.prisma.mall_platform_order_items.findMany({
    where: {
      id: { in: requestedIds },
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      mall_platform_seller_id: true,
    },
  });
  if (orderItems.length !== requestedIds.length) {
    throw new HttpException("Some order items were not found.", 404);
  }
  const shipmentItems =
    await MyGlobal.prisma.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_order_item_id: { in: requestedIds },
        deleted_at: null,
      },
      select: {
        mall_platform_order_item_id: true,
        mall_platform_shipment_id: true,
        shipment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  for (const orderItem of orderItems) {
    if (
      orderItem.mall_platform_seller_id !== shipment.mall_platform_seller_id
    ) {
      throw new HttpException(
        "Order items must belong to the same seller as the shipment.",
        400,
      );
    }
    if (orderItem.status !== "paid") {
      throw new HttpException("Order item is not eligible for shipping.", 409);
    }
    for (const assignment of shipmentItems.filter(
      (record) => record.mall_platform_order_item_id === orderItem.id,
    )) {
      if (
        assignment.mall_platform_shipment_id !== props.shipmentId &&
        assignment.shipment.status === "preparing"
      ) {
        throw new HttpException(
          "An order item can belong to only one active shipment.",
          409,
        );
      }
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.mall_platform_shipment_items.deleteMany({
      where: {
        mall_platform_shipment_id: props.shipmentId,
        mall_platform_order_item_id: { notIn: requestedIds },
      },
    });
    const existing = await tx.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_shipment_id: props.shipmentId,
        mall_platform_order_item_id: { in: requestedIds },
      },
      select: {
        mall_platform_order_item_id: true,
      },
    });
    const existingIds = new Set(
      existing.map((record) => record.mall_platform_order_item_id),
    );
    const missingIds = requestedIds.filter((id) => !existingIds.has(id));
    for (const orderItemId of missingIds) {
      await tx.mall_platform_shipment_items.create({
        data: {
          id: v4(),
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          mall_platform_shipment_id: props.shipmentId,
          mall_platform_order_item_id: orderItemId,
        },
      });
    }
  });
  const records = await MyGlobal.prisma.mall_platform_shipment_items.findMany({
    where: {
      mall_platform_shipment_id: props.shipmentId,
      deleted_at: null,
    },
    orderBy: { created_at: "asc" },
    ...MallPlatformShipmentItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_shipment_items.count({
    where: {
      mall_platform_shipment_id: props.shipmentId,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
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
// export async function patchMallPlatformAdministratorShipmentsShipmentIdShipmentItems(props: {
//   administrator: AdministratorPayload;
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