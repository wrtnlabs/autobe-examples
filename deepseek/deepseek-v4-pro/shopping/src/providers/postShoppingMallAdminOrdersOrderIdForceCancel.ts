import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrdersOrderIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IForceCancel;
}): Promise<IShoppingMallOrder> {
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: props.orderId },
    select: {
      id: true,
      status: true,
      quantity: true,
      shopping_mall_product_variant_id: true,
      shopping_mall_shipment_id: true,
    },
  });
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date().toISOString();
    for (const item of orderItems) {
      if (item.status === "cancelled") {
        continue;
      }
      const existingRequest =
        await tx.shopping_mall_cancellation_requests.findFirst({
          where: { shopping_mall_order_item_id: item.id },
        });
      let cancellationRequestId: string;
      if (existingRequest !== null) {
        await tx.shopping_mall_cancellation_requests.update({
          where: { id: existingRequest.id },
          data: {
            status: "approved",
            reason: props.body.reason,
            updated_at: now,
          },
        });
        cancellationRequestId = existingRequest.id;
      } else {
        const newRequest = await tx.shopping_mall_cancellation_requests.create({
          data: {
            id: v4(),
            shopping_mall_order_item_id: item.id,
            reason: props.body.reason,
            status: "approved",
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
        cancellationRequestId = newRequest.id;
      }
      await tx.shopping_mall_cancellation_request_snapshots.create({
        data: {
          id: v4(),
          shopping_mall_cancellation_request_id: cancellationRequestId,
          reason: props.body.reason,
          status: "approved",
          created_at: now,
        },
      });
      await tx.shopping_mall_order_items.update({
        where: { id: item.id },
        data: {
          status: "cancelled",
          shopping_mall_shipment_id: null,
          updated_at: now,
        },
      });
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            item.shopping_mall_product_variant_id,
          quantity_change: item.quantity,
          reason: `Administrator force-cancellation: ${props.body.reason}`,
          created_at: now,
        },
      });
    }
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
  });
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(updatedOrder);
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
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
// import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
// import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
// import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
// import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
// import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdminOrdersOrderIdForceCancel(props: {
//   admin: AdminPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IShoppingMallOrder.IForceCancel;
// }): Promise<IShoppingMallOrder> {
//   const record = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
//     ...ShoppingMallOrderTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------