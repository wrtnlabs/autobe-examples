import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemSellerSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrdersOrderIdItemsOrderItemIdSellerSnapshot(props: {
  seller: SellerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemSellerSnapshot> {
  // Find the order item first to validate ownership
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.orderItemId,
        order_id: props.orderId,
      },
      select: {
        id: true,
        seller_id: true,
      },
    });
  // Validate seller owns this order item
  if (orderItem.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get the seller snapshot for this order item
  const record =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
        where: {
          order_item_id: orderItem.id,
        },
      },
    );
  return await EcommerceMallOrderItemSellerSnapshotTransformer.transform(
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
// import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerOrdersOrderIdItemsOrderItemIdSellerSnapshot(props: {
//   seller: SellerPayload;
//   orderId: string;
//   orderItemId: string;
// }): Promise<IEcommerceMallOrderItemSellerSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findFirstOrThrow({
//     ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemSellerSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------