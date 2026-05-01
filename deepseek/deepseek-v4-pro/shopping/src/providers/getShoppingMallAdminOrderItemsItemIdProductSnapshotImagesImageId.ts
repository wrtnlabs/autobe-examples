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
import { ShoppingMallOrderItemProductSnapshotImageTransformer } from "../transformers/ShoppingMallOrderItemProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminOrderItemsItemIdProductSnapshotImagesImageId(props: {
  admin: AdminPayload;
  itemId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemProductSnapshotImage> {
  const record =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.findFirstOrThrow(
      {
        ...ShoppingMallOrderItemProductSnapshotImageTransformer.select(),
        where: {
          id: props.imageId,
          productSnapshot: {
            shopping_mall_order_item_id: props.itemId,
          },
        },
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
// export async function getShoppingMallAdminOrderItemsItemIdProductSnapshotImagesImageId(props: {
//   admin: AdminPayload;
//   itemId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallOrderItemProductSnapshotImage> {
//   const record = await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.findFirstOrThrow({
//     ...ShoppingMallOrderItemProductSnapshotImageTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderItemProductSnapshotImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------