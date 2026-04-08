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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentItemTransformer } from "../transformers/MallPlatformShipmentItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerShipmentsShipmentIdItemsShipmentItemId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.IUpdate;
}): Promise<IMallPlatformShipmentItem> {
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    const shipmentItem =
      await tx.mall_platform_shipment_items.findUniqueOrThrow({
        where: { id: props.shipmentItemId },
        select: {
          id: true,
          mall_platform_shipment_id: true,
          mall_platform_order_item_id: true,
          shipment: {
            select: {
              id: true,
              mall_platform_seller_id: true,
            },
          },
        },
      });
    if (shipmentItem.mall_platform_shipment_id !== props.shipmentId) {
      throw new HttpException(
        "Shipment item does not belong to the specified shipment",
        400,
      );
    }
    if (shipmentItem.shipment.mall_platform_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (props.body.shipmentId !== undefined) {
      const targetShipment = await tx.mall_platform_shipments.findUniqueOrThrow(
        {
          where: { id: props.body.shipmentId },
          select: {
            id: true,
            mall_platform_seller_id: true,
          },
        },
      );
      if (targetShipment.mall_platform_seller_id !== props.seller.id) {
        throw new HttpException("Forbidden", 403);
      }
      const conflict = await tx.mall_platform_shipment_items.findFirst({
        where: {
          mall_platform_order_item_id: shipmentItem.mall_platform_order_item_id,
          NOT: {
            id: shipmentItem.id,
          },
        },
        select: {
          id: true,
        },
      });
      if (conflict !== null) {
        throw new HttpException(
          "Order item is already assigned to another shipment",
          409,
        );
      }
      await tx.mall_platform_shipment_items.update({
        where: { id: props.shipmentItemId },
        data: {
          mall_platform_shipment_id: props.body.shipmentId,
        },
      });
    }
    return await tx.mall_platform_shipment_items.findUniqueOrThrow({
      where: { id: props.shipmentItemId },
      ...MallPlatformShipmentItemTransformer.select(),
    });
  });
  return await MallPlatformShipmentItemTransformer.transform(record);
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
// export async function putMallPlatformSellerShipmentsShipmentIdItemsShipmentItemId(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   shipmentItemId: string & tags.Format<"uuid">;
//   body: IMallPlatformShipmentItem.IUpdate;
// }): Promise<IMallPlatformShipmentItem> {
//   await MyGlobal.prisma.mall_platform_shipment_items.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_shipment_items.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformShipmentItemTransformer.select(),
//   });
//   return await MallPlatformShipmentItemTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------