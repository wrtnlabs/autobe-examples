import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategorySnapshotTransformer } from "../transformers/ShoppingMallCategorySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCategoriesCategoryIdSnapshotsSnapshotId(props: {
  categoryId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCategorySnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_category_snapshots.findFirstOrThrow({
      ...ShoppingMallCategorySnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        shopping_mall_category_id: props.categoryId,
      },
    });
  return await ShoppingMallCategorySnapshotTransformer.transform(record);
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
// import { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCategoriesCategoryIdSnapshotsSnapshotId(props: {
//   categoryId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallCategorySnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_category_snapshots.findFirstOrThrow({
//     ...ShoppingMallCategorySnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallCategorySnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------