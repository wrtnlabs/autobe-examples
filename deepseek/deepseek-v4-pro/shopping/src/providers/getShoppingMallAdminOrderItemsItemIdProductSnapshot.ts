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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemProductSnapshotTransformer } from "../transformers/ShoppingMallOrderItemProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminOrderItemsItemIdProductSnapshot(props: {
  admin: AdminPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshots.findFirstOrThrow(
      {
        where: {
          shopping_mall_order_item_id: props.itemId,
        },
        ...ShoppingMallOrderItemProductSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemProductSnapshotTransformer.transform(
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
// import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
// import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminOrderItemsItemIdProductSnapshot(props: {
//   admin: AdminPayload;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallOrderItemProductSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_order_item_product_snapshots.findFirstOrThrow({
//     ...ShoppingMallOrderItemProductSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderItemProductSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------