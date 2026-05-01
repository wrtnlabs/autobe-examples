import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryCollector } from "../collectors/ShoppingMallCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  // Name uniqueness check within parent scope
  const existingName = await MyGlobal.prisma.shopping_mall_categories.findFirst(
    {
      where: {
        name: props.body.name,
        deleted_at: null,
        parent_id: props.body.parent_id ?? null,
      },
    },
  );
  if (existingName !== null) {
    throw new HttpException(
      props.body.parent_id
        ? "A subcategory with this name already exists under the specified parent."
        : "A top-level category with this name already exists.",
      409,
    );
  }
  // Parent category validation
  if (props.body.parent_id) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.parent_id },
      select: { id: true, parent_id: true, deleted_at: true },
    });
    if (parent === null || parent.deleted_at !== null) {
      throw new HttpException(
        "The specified parent category does not exist or has been deleted.",
        422,
      );
    }
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Subcategories cannot have subcategories. The parent category must be a top-level category.",
        422,
      );
    }
  }
  const record = await MyGlobal.prisma.shopping_mall_categories.create({
    data: await ShoppingMallCategoryCollector.collect({
      body: props.body,
    }),
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
// export async function postShoppingMallAdminCategories(props: {
//   admin: AdminPayload;
//   body: IShoppingMallCategory.ICreate;
// }): Promise<IShoppingMallCategory> {
//   const record = await MyGlobal.prisma.shopping_mall_categories.create({
//     data: await ShoppingMallCategoryCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallCategoryTransformer.select(),
//   });
//   return await ShoppingMallCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------