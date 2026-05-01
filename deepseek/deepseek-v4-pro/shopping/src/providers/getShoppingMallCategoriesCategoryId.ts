import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCategory> {
  const record =
    await MyGlobal.prisma.shopping_mall_categories.findFirstOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      ...ShoppingMallCategoryTransformer.select(),
    });
  return await ShoppingMallCategoryTransformer.transform(record);
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
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCategoriesCategoryId(props: {
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallCategory> {
//   const record = await MyGlobal.prisma.shopping_mall_categories.findFirstOrThrow({
//     ...ShoppingMallCategoryTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------