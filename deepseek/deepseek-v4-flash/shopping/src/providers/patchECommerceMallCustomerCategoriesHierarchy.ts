import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallCategoryAtHierarchyTransformer } from "../transformers/ECommerceMallCategoryAtHierarchyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallCustomerCategoriesHierarchy(props: {
  customer: CustomerPayload;
  body: IECommerceMallCategory.IHierarchyRequest;
}): Promise<IECommerceMallCategory.IHierarchy> {
  // Determine which top-level category IDs to include,
  // applying optional name-based search filter.
  let topLevelIds: string[] | undefined;
  if (props.body.name !== undefined) {
    // Find all non-deleted categories matching the name filter
    // using case-insensitive partial matching (ILIKE equivalent).
    const matching = await MyGlobal.prisma.e_commerce_mall_categories.findMany({
      where: {
        deleted_at: null,
        name: {
          contains: props.body.name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        parent_id: true,
      },
    });
    // Collect the set of top-level categories to include:
    // - matching top-level categories (parent_id IS NULL) are included directly
    // - matching subcategories cause their parent top-level to be included
    const ids = new Set<string>();
    for (const cat of matching) {
      if (cat.parent_id === null) {
        ids.add(cat.id);
      } else {
        ids.add(cat.parent_id);
      }
    }
    // If no categories match at all, return empty hierarchy immediately
    // to avoid an unnecessary database query.
    if (ids.size === 0) {
      return { topLevelCategories: [] };
    }
    topLevelIds = [...ids];
  }
  // Query top-level categories (parent_id IS NULL) ordered by created_at ASC.
  // Apply name-filtered ID set when a search term was provided.
  const topLevelCategories =
    await MyGlobal.prisma.e_commerce_mall_categories.findMany({
      ...ECommerceMallCategoryAtHierarchyTransformer.select(),
      where: {
        deleted_at: null,
        parent_id: null,
        ...(topLevelIds ? { id: { in: topLevelIds } } : {}),
      },
      orderBy: {
        created_at: "asc",
      },
    });
  // Transform through the hierarchy transformer which recursively
  // fetches subcategories for each top-level category using
  // ECommerceMallCategoryAtHierarchyNodeTransformer's internal
  // VariadicSingleton cache for efficient batched queries.
  return await ECommerceMallCategoryAtHierarchyTransformer.transform(
    topLevelCategories,
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
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallCustomerCategoriesHierarchy(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallCategory.IHierarchyRequest;
// }): Promise<IECommerceMallCategory.IHierarchy> {
//   const record = await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
//     ...ECommerceMallCategoryAtHierarchyTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallCategoryAtHierarchyTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------