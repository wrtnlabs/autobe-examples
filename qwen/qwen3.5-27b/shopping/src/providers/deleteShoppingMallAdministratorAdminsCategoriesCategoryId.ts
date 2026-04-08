import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorAdminsCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the category (404 if not found)
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
    });
  // Check if already soft-deleted
  if (category.deleted_at !== null) {
    throw new HttpException("Category is already deleted", 409);
  }
  // Update all products in this category to be uncategorized
  await MyGlobal.prisma.shopping_mall_products.updateMany({
    where: { shopping_mall_category_id: props.categoryId },
    data: { shopping_mall_category_id: null },
  });
  // Find all subcategories
  const subcategories = await MyGlobal.prisma.shopping_mall_categories.findMany(
    {
      where: {
        parent_category_id: props.categoryId,
        deleted_at: null,
      },
    },
  );
  // For each subcategory: update products and soft delete
  for (const subcategory of subcategories) {
    // Update products in subcategory to be uncategorized
    await MyGlobal.prisma.shopping_mall_products.updateMany({
      where: { shopping_mall_category_id: subcategory.id },
      data: { shopping_mall_category_id: null },
    });
    // Soft delete the subcategory
    await MyGlobal.prisma.shopping_mall_categories.update({
      where: { id: subcategory.id },
      data: { deleted_at: new Date() },
    });
  }
  // Soft delete the main category
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: { deleted_at: new Date() },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteShoppingMallAdministratorAdminsCategoriesCategoryId(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------