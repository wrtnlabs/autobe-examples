import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify order exists (404 if not found)
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // 2. Fetch shipment with related order items
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
      ecommerce_mall_seller_id: true,
      deleted_at: true,
      shipmentItems: {
        select: {
          orderItem: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });
  // 3. Shipment not found
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // 4. Verify shipment belongs to the specified order
  if (shipment.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException("Shipment not found", 404);
  }
  // 5. Verify shipment belongs to authenticated seller
  if (shipment.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 6. Verify shipment is not already deleted
  if (shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  // 7. Check if any order items have been delivered
  const hasDeliveredItems = shipment.shipmentItems.some(
    (item) => item.orderItem.status === "delivered",
  );
  if (hasDeliveredItems) {
    throw new HttpException(
      "Cannot delete shipment: items have already been delivered",
      409,
    );
  }
  // 8. Soft delete the shipment
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      deleted_at: new Date(),
    },
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallSellerOrdersOrderIdShipmentsShipmentId(props: {
//   seller: SellerPayload;
//   orderId: string & tags.Format<"uuid">;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------