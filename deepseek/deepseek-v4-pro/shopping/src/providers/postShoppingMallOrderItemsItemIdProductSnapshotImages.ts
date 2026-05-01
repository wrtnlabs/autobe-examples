import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderItemProductSnapshotImageCollector } from "../collectors/ShoppingMallOrderItemProductSnapshotImageCollector";
import { ShoppingMallOrderItemProductSnapshotImageTransformer } from "../transformers/ShoppingMallOrderItemProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallOrderItemsItemIdProductSnapshotImages(props: {
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemProductSnapshotImage.ICreate;
}): Promise<IShoppingMallOrderItemProductSnapshotImage> {
  await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
    where: { id: props.itemId },
    select: { id: true },
  });
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshots.findUniqueOrThrow(
      {
        where: { shopping_mall_order_item_id: props.itemId },
        select: { id: true },
      },
    );
  const record =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.create(
      {
        data: await ShoppingMallOrderItemProductSnapshotImageCollector.collect({
          body: props.body,
          shoppingMallOrderItemProductSnapshots: snapshot,
        }),
        ...ShoppingMallOrderItemProductSnapshotImageTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemProductSnapshotImageTransformer.transform(
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
// import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
// import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallOrderItemsItemIdProductSnapshotImages(props: {
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallOrderItemProductSnapshotImage.ICreate;
// }): Promise<IShoppingMallOrderItemProductSnapshotImage> {
//   const record = await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.create({
//     data: await ShoppingMallOrderItemProductSnapshotImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallOrderItemProductSnapshotImageTransformer.select(),
//   });
//   return await ShoppingMallOrderItemProductSnapshotImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------