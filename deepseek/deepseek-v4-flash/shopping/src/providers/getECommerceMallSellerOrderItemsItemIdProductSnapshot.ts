import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallOrderItemSnapshotTransformer } from "../transformers/ECommerceMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallSellerOrderItemsItemIdProductSnapshot(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallOrderItemSnapshot> {
  const orderItem =
    await MyGlobal.prisma.e_commerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        productVariant: {
          select: {
            product: {
              select: { seller_id: true },
            },
          },
        },
      },
    });
  if (orderItem.productVariant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.e_commerce_mall_order_item_snapshots.findUniqueOrThrow(
      {
        where: { e_commerce_mall_order_item_id: props.itemId },
        ...ECommerceMallOrderItemSnapshotTransformer.select(),
      },
    );
  return await ECommerceMallOrderItemSnapshotTransformer.transform(snapshot);
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
// import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSellerOrderItemsItemIdProductSnapshot(props: {
//   seller: SellerPayload;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallOrderItemSnapshot> {
//   const record = await MyGlobal.prisma.e_commerce_mall_order_item_snapshots.findFirstOrThrow({
//     ...ECommerceMallOrderItemSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallOrderItemSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------