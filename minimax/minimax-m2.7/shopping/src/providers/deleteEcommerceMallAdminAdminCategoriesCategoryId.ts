import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate category exists and is a top-level category (not a subcategory)
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: { id: true, parent_id: true },
    });
  // Only allow deleting top-level categories (those without a parent)
  if (category.parent_id !== null) {
    throw new HttpException(
      "Cannot delete a subcategory. Only top-level categories can be deleted.",
      400,
    );
  }
  // Find all subcategory IDs (where parent_id references this category)
  const subcategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: { parent_id: props.categoryId },
      select: { id: true },
    });
  const subcategoryIds = subcategories.map((sub) => sub.id);
  // Collect all category IDs to uncategorize (main + subcategories)
  const allCategoryIds = [props.categoryId, ...subcategoryIds];
  // Atomic transaction: uncategorize products and delete categories
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Uncategorize all products (main category and subcategories)
    await tx.ecommerce_mall_products.updateMany({
      where: { ecommerce_mall_category_id: { in: allCategoryIds } },
      data: { ecommerce_mall_category_id: null as unknown as string },
    });
    // Delete all subcategories first
    if (subcategoryIds.length > 0) {
      await tx.ecommerce_mall_categories.deleteMany({
        where: { id: { in: subcategoryIds } },
      });
    }
    // Delete the main category
    await tx.ecommerce_mall_categories.delete({
      where: { id: props.categoryId },
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
// export async function deleteEcommerceMallAdminAdminCategoriesCategoryId(props: {
//   admin: AdminPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------