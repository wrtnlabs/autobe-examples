import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEcommerceMallSuperAdminCategoriesCategoryId(props: {
  superAdmin: SuperadminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify category exists and is not already deleted
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
    where: { id: props.categoryId },
    select: { id: true, deleted_at: true },
  });
  if (category === null) {
    throw new HttpException("Category not found", 404);
  }
  if (category.deleted_at !== null) {
    throw new HttpException("Category already deleted", 404);
  }
  // 2. Retrieve all subcategory IDs recursively
  const getAllSubcategoryIds = async (parentId: string): Promise<string[]> => {
    const subcategories =
      await MyGlobal.prisma.ecommerce_mall_categories.findMany({
        where: { parent_id: parentId },
        select: { id: true },
      });
    const directSubIds: string[] = subcategories.map((sub) => sub.id);
    const nestedIds: string[] = [];
    for (const sub of subcategories) {
      const childIds = await getAllSubcategoryIds(sub.id);
      nestedIds.push(...childIds);
    }
    return [...directSubIds, ...nestedIds];
  };
  const subcategoryIds = await getAllSubcategoryIds(props.categoryId);
  const allCategoryIds = [props.categoryId, ...subcategoryIds];
  // 3. Execute deletion in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Set category_id to null for all products belonging to target category and subcategories
    await tx.ecommerce_mall_products.updateMany({
      where: {
        ecommerce_mall_category_id: {
          in: allCategoryIds,
        },
      },
      data: {
        ecommerce_mall_category_id: undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    // Delete all subcategories (cascade handles their own subcategory relationships)
    if (subcategoryIds.length > 0) {
      await tx.ecommerce_mall_categories.deleteMany({
        where: {
          id: { in: subcategoryIds },
        },
      });
    }
    // Soft-delete the target category by setting deleted_at to current timestamp
    await tx.ecommerce_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
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
// export async function deleteEcommerceMallSuperAdminCategoriesCategoryId(props: {
//   superAdmin: SuperadminPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------