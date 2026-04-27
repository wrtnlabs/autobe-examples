import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallOrderTransformer } from "../transformers/ECommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAdministratorOrdersOrderCodeForceCancel(props: {
  administrator: AdministratorPayload;
  orderCode: string;
}): Promise<IECommerceMallOrder> {
  // 1. Lookup the order by code (unique string)
  const order = await MyGlobal.prisma.e_commerce_mall_orders.findFirstOrThrow({
    where: { code: props.orderCode },
    select: { id: true },
  });
  // 2. Fetch all order items belonging to this order
  const orderItems = await MyGlobal.prisma.e_commerce_mall_order_items.findMany(
    {
      where: { e_commerce_mall_order_id: order.id },
      select: {
        id: true,
        status: true,
        quantity: true,
        e_commerce_mall_product_variant_id: true,
      },
    },
  );
  // 3. Filter eligible items (skip terminal states)
  const terminalStatuses = new Set(["cancelled", "refunded", "delivered"]);
  const eligibleItems = orderItems.filter(
    (item) => !terminalStatuses.has(item.status),
  );
  // 4. Process eligible items in a transaction
  if (eligibleItems.length > 0) {
    await MyGlobal.prisma.$transaction(async (tx) => {
      const now = new Date().toISOString();
      for (const item of eligibleItems) {
        // Update order item status to "cancelled"
        await tx.e_commerce_mall_order_items.update({
          where: { id: item.id },
          data: {
            status: "cancelled",
            updated_at: new Date(now),
          },
        });
        // Create status log entry
        await tx.e_commerce_mall_order_item_status_logs.create({
          data: {
            id: v4(),
            e_commerce_mall_order_item_id: item.id,
            from_status: item.status,
            to_status: "cancelled",
            reason: "administrator_force_cancel",
            created_at: new Date(now),
            updated_at: new Date(now),
          },
        });
        // Create positive inventory record for stock restoration
        await tx.e_commerce_mall_inventory_records.create({
          data: {
            id: v4(),
            e_commerce_mall_product_variant_id:
              item.e_commerce_mall_product_variant_id,
            quantity_change: item.quantity,
            reason: "force-cancelled",
            created_at: new Date(now),
          },
        });
      }
      // Update order's updated_at timestamp
      await tx.e_commerce_mall_orders.update({
        where: { id: order.id },
        data: { updated_at: new Date(now) },
      });
    });
  }
  // 5. Return the updated order with full details
  const updatedOrder =
    await MyGlobal.prisma.e_commerce_mall_orders.findFirstOrThrow({
      where: { id: order.id },
      ...ECommerceMallOrderTransformer.select(),
    });
  return await ECommerceMallOrderTransformer.transform(updatedOrder);
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
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
// import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
// import { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
// import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
// import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
// import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
// import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
// import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
// import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAdministratorOrdersOrderCodeForceCancel(props: {
//   administrator: AdministratorPayload;
//   orderCode: string;
// }): Promise<IECommerceMallOrder> {
//   const record = await MyGlobal.prisma.e_commerce_mall_orders.findFirstOrThrow({
//     ...ECommerceMallOrderTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------