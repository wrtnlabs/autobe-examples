import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemSellerSnapshotTransformer } from "../transformers/ShoppingMallOrderItemSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminOrderItemsItemIdSellerSnapshot(props: {
  admin: AdminPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSellerSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_order_item_seller_snapshots.findFirstOrThrow(
      {
        where: { shopping_mall_order_item_id: props.itemId },
        ...ShoppingMallOrderItemSellerSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemSellerSnapshotTransformer.transform(record);
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
// import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminOrderItemsItemIdSellerSnapshot(props: {
//   admin: AdminPayload;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallOrderItemSellerSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_order_item_seller_snapshots.findFirstOrThrow({
//     ...ShoppingMallOrderItemSellerSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderItemSellerSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------