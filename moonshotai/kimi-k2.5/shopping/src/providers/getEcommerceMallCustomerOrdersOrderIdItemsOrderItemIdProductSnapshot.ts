import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemProductSnapshotTransformer } from "../transformers/EcommerceMallOrderItemProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdProductSnapshot(props: {
  customer: CustomerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemProductSnapshot> {
  // Verify order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      customer_id: true,
    },
  });
  // Authorization check: customer can only view their own orders
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify order item exists and belongs to the order
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        order_id: true,
      },
    });
  // Verify order item belongs to the specified order
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException("Order item not found in specified order", 404);
  }
  // Retrieve the product snapshot
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findFirstOrThrow(
      {
        where: { order_item_id: props.orderItemId },
        ...EcommerceMallOrderItemProductSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemProductSnapshotTransformer.transform(
    snapshot,
  );
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
// import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
// import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdProductSnapshot(props: {
//   customer: CustomerPayload;
//   orderId: string;
//   orderItemId: string;
// }): Promise<IEcommerceMallOrderItemProductSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findFirstOrThrow({
//     ...EcommerceMallOrderItemProductSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemProductSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------