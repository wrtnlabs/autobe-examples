import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallCategoryAtHierarchyTransformer } from "../transformers/EcommerceMallCategoryAtHierarchyTransformer";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdministratorCategoriesHierarchy(props: {
  administrator: AdministratorPayload;
}): Promise<IEcommerceMallCategory.IHierarchy> {
  const allCategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: {
        deleted_at: null,
      },
      ...EcommerceMallCategoryAtHierarchyTransformer.select(),
      orderBy: [
        { parent: { id: "asc" } },
        { sort_order: "asc" },
        { name: "asc" },
      ],
    });
  if (allCategories.length === 0) {
    throw new HttpException("No categories found", 404);
  }
  const categoryMap = new Map<string, IEcommerceMallCategory.IHierarchy>();
  const hasParent = new Set<string>();
  for (const record of allCategories) {
    const transformed =
      await EcommerceMallCategoryAtHierarchyTransformer.transform(record);
    categoryMap.set(record.id, transformed);
    if (record.parent !== null && record.parent !== undefined) {
      hasParent.add(record.id);
    }
  }
  const parentToChildren = new Map<string, IEcommerceMallCategory.ISummary[]>();
  for (const record of allCategories) {
    if (record.parent !== null && record.parent !== undefined) {
      const parentId = record.parent.id;
      if (!parentToChildren.has(parentId)) {
        parentToChildren.set(parentId, []);
      }
      const parentTransformed = categoryMap.get(parentId);
      if (parentTransformed !== undefined) {
        const parentChildren = parentToChildren.get(parentId)!;
        const childTransformed =
          await EcommerceMallCategoryAtSummaryTransformer.transform(record);
        parentChildren.push(childTransformed);
      }
    }
  }
  for (const [parentId, childrenRecords] of parentToChildren.entries()) {
    const parent = categoryMap.get(parentId);
    if (parent !== undefined) {
      for (const childTransformed of childrenRecords) {
        parent.children.push(childTransformed);
      }
    }
  }
  const topLevelCategories = Array.from(categoryMap.values()).filter(
    (category) => !hasParent.has(category.id),
  );
  const root = topLevelCategories[0];
  if (root === undefined) {
    throw new HttpException("No top-level categories found", 404);
  }
  return {
    id: root.id,
    name: root.name,
    description: root.description,
    sort_order: root.sort_order,
    created_at: toISOStringSafe(root.created_at),
    updated_at: toISOStringSafe(root.updated_at),
    deleted_at:
      root.deleted_at === null ? null : toISOStringSafe(root.deleted_at),
    creator_id: root.creator_id,
    creator: root.creator,
    children: root.children,
    product_count: root.product_count,
  };
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
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdministratorCategoriesHierarchy(props: {
//   administrator: AdministratorPayload;
// }): Promise<IEcommerceMallCategory.IHierarchy> {
//   const record = await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
//     ...EcommerceMallCategoryAtHierarchyTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCategoryAtHierarchyTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------