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
import { MallPlatformShipmentCollector } from "../collectors/MallPlatformShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerShipments(props: {
  seller: SellerPayload;
  body: IMallPlatformShipment.ICreate;
}): Promise<IMallPlatformShipment> {
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const orderItemIds: string[] = props.body.shipmentItems.flatMap(
      (item) => item.orderItemIds,
    );
    const uniqueOrderItemIds: string[] = [...new Set(orderItemIds)];
    if (orderItemIds.length !== uniqueOrderItemIds.length) {
      throw new HttpException("Duplicate order items are not allowed", 400);
    }
    const orderItems = await prisma.mall_platform_order_items.findMany({
      where: {
        id: { in: uniqueOrderItemIds },
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        mall_platform_seller_id: true,
        mall_platform_order_id: true,
        shipmentItem: {
          where: {
            deleted_at: null,
            shipment: {
              deleted_at: null,
              status: { not: "cancelled" },
            },
          },
          select: {
            id: true,
          },
        },
      },
    });
    if (orderItems.length !== uniqueOrderItemIds.length) {
      throw new HttpException("One or more order items were not found", 400);
    }
    const firstOrderItem = orderItems[0];
    if (firstOrderItem === undefined) {
      throw new HttpException("One or more order items were not found", 400);
    }
    if (
      orderItems.some(
        (item) => item.mall_platform_seller_id !== props.seller.id,
      )
    ) {
      throw new HttpException(
        "You can only create shipments for your own order items",
        403,
      );
    }
    if (
      orderItems.some(
        (item) =>
          item.mall_platform_order_id !== firstOrderItem.mall_platform_order_id,
      )
    ) {
      throw new HttpException(
        "All shipment items must belong to the same order",
        400,
      );
    }
    if (
      orderItems.some(
        (item) =>
          item.status !== "paid" && item.status !== "waiting_for_shipment",
      )
    ) {
      throw new HttpException(
        "One or more order items are not available for shipping",
        400,
      );
    }
    if (orderItems.some((item) => item.shipmentItem !== null)) {
      throw new HttpException(
        "One or more order items are already assigned to an active shipment",
        400,
      );
    }
    return await prisma.mall_platform_shipments.create({
      data: await MallPlatformShipmentCollector.collect({
        body: props.body,
        seller: props.seller,
        order: { id: firstOrderItem.mall_platform_order_id },
      }),
      ...MallPlatformShipmentTransformer.select(),
    });
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
// import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
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