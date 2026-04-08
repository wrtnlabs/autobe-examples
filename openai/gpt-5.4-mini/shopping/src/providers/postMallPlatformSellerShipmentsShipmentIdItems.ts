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
import { MallPlatformShipmentItemCollector } from "../collectors/MallPlatformShipmentItemCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentItemTransformer } from "../transformers/MallPlatformShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerShipmentsShipmentIdItems(props: {
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
      },
    });
  if (shipment.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const uniqueOrderItemIds = new Set(props.body.orderItemIds);
  if (uniqueOrderItemIds.size !== props.body.orderItemIds.length) {
    throw new HttpException("Duplicate order item IDs are not allowed", 400);
  }
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const orderItems = await prisma.mall_platform_order_items.findMany({
      where: {
        id: { in: props.body.orderItemIds },
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
        status: true,
      },
    });
    if (orderItems.length !== props.body.orderItemIds.length) {
      throw new HttpException("Some order items were not found", 404);
    }
    for (const orderItem of orderItems) {
      if (orderItem.mall_platform_seller_id !== props.seller.id) {
        throw new HttpException(
          "Order items must belong to the same seller",
          409,
        );
      }
      if (orderItem.mall_platform_seller_id !== null) {
        throw new HttpException(
          "Order item is already assigned to another shipment",
          409,
        );
      }
      if (orderItem.status !== "paid") {
        throw new HttpException("Order item is not eligible for shipping", 409);
      }
    }
    let firstCreated: Prisma.mall_platform_shipment_itemsGetPayload<
      ReturnType<typeof MallPlatformShipmentItemTransformer.select>
    > | null = null;
    for (const orderItemId of props.body.orderItemIds) {
      const createdItem = await prisma.mall_platform_shipment_items.create({
        data: (
          await MallPlatformShipmentItemCollector.collect({
            body: { orderItemIds: [orderItemId] },
            shipment: { id: props.shipmentId },
          })
        )[0],
        ...MallPlatformShipmentItemTransformer.select(),
      });
      if (firstCreated === null) {
        firstCreated = createdItem;
      }
    }
    await prisma.mall_platform_order_items.updateMany({
      where: {
        id: { in: props.body.orderItemIds },
      },
      data: {
        status: "shipped",
      },
    });
    if (firstCreated === null) {
      throw new HttpException("No shipment items were created", 500);
    }
    return firstCreated;
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformSellerShipmentsShipmentIdItems(props: {
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