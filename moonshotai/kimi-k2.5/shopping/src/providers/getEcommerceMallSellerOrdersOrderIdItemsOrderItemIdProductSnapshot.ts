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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemProductSnapshotTransformer } from "../transformers/EcommerceMallOrderItemProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrdersOrderIdItemsOrderItemIdProductSnapshot(props: {
  seller: SellerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemProductSnapshot> {
  // Validate order exists
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // Validate order item exists and belongs to the order and seller
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.orderItemId,
        order_id: props.orderId,
        seller_id: props.seller.id,
      },
      select: { id: true },
    });
  // Retrieve and transform the product snapshot
  const record =
    await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallOrderItemProductSnapshotTransformer.select(),
        where: {
          order_item_id: orderItem.id,
        },
      },
    );
  return await EcommerceMallOrderItemProductSnapshotTransformer.transform(
    record,
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
// export async function getEcommerceMallSellerOrdersOrderIdItemsOrderItemIdProductSnapshot(props: {
//   seller: SellerPayload;
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