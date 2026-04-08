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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShipmentItemAtSummaryTransformer } from "../transformers/MallPlatformShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerShipmentsShipmentIdShipmentItems(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.IUpdate;
}): Promise<IPageIMallPlatformShipmentItem.ISummary> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        mall_platform_seller_id: true,
        mall_platform_order_id: true,
      },
    });
  const order = await MyGlobal.prisma.mall_platform_orders.findUniqueOrThrow({
    where: { id: shipment.mall_platform_order_id },
    select: {
      id: true,
      customer_id: true,
    },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment unavailable", 400);
  }
  if (shipment.status === "completed") {
    throw new HttpException("Shipment unavailable", 400);
  }
  const requestedOrderItemIds = props.body.orderItemIds;
  const requestedOrderItems =
    await MyGlobal.prisma.mall_platform_order_items.findMany({
      where: {
        id: { in: requestedOrderItemIds },
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        mall_platform_seller_id: true,
        shipmentItem: {
          select: {
            id: true,
            mall_platform_shipment_id: true,
            shipment: {
              select: {
                id: true,
                status: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  if (requestedOrderItems.length !== requestedOrderItemIds.length) {
    throw new HttpException("One or more order items were not found", 404);
  }
  for (const item of requestedOrderItems) {
    if (item.mall_platform_seller_id !== shipment.mall_platform_seller_id) {
      throw new HttpException(
        "Requested order item belongs to a different seller",
        400,
      );
    }
    if (item.status !== "paid" && item.status !== "ready") {
      throw new HttpException(
        "Requested order item is not eligible for shipping",
        400,
      );
    }
    const assignments = Array.isArray(item.shipmentItem)
      ? item.shipmentItem
      : item.shipmentItem
        ? [item.shipmentItem]
        : [];
    for (const assignment of assignments) {
      if (
        assignment.mall_platform_shipment_id !== shipment.id &&
        assignment.shipment.deleted_at === null &&
        assignment.shipment.status !== "completed"
      ) {
        throw new HttpException(
          "Requested order item is already assigned to another active shipment",
          400,
        );
      }
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const currentAssignments = await tx.mall_platform_shipment_items.findMany({
      where: {
        mall_platform_shipment_id: shipment.id,
        deleted_at: null,
      },
      select: {
        id: true,
        mall_platform_order_item_id: true,
      },
    });
    const requestedItemSet = new Set<string>(requestedOrderItemIds);
    const currentItemSet = new Set<string>(
      currentAssignments.map((row) => row.mall_platform_order_item_id),
    );
    for (const assignment of currentAssignments) {
      if (!requestedItemSet.has(assignment.mall_platform_order_item_id)) {
        await tx.mall_platform_shipment_items.delete({
          where: { id: assignment.id },
        });
      }
    }
    for (const orderItemId of requestedOrderItemIds) {
      if (!currentItemSet.has(orderItemId)) {
        await tx.mall_platform_shipment_items.create({
          data: {
            id: v4(),
            mall_platform_shipment_id: shipment.id,
            mall_platform_order_item_id: orderItemId,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
        });
      }
    }
  });
  const records = await MyGlobal.prisma.mall_platform_shipment_items.findMany({
    where: {
      mall_platform_shipment_id: shipment.id,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
    ...MallPlatformShipmentItemAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: 1,
      limit: records.length,
      records: records.length,
      pages: records.length > 0 ? 1 : 0,
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
// export async function patchMallPlatformCustomerShipmentsShipmentIdShipmentItems(props: {
//   customer: CustomerPayload;
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