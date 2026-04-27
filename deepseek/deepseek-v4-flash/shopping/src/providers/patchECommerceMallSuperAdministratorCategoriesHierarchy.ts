import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallCategoryAtHierarchyTransformer } from "../transformers/ECommerceMallCategoryAtHierarchyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSuperAdministratorCategoriesHierarchy(props: {
  superAdministrator: SuperadministratorPayload;
  body: IECommerceMallCategory.IHierarchyRequest;
}): Promise<IECommerceMallCategory.IHierarchy> {
  // Query all non-deleted categories ordered by created_at ASC
  const allCategories =
    await MyGlobal.prisma.e_commerce_mall_categories.findMany({
      ...ECommerceMallCategoryAtHierarchyTransformer.select(),
      where: { deleted_at: null },
      orderBy: { created_at: "asc" },
    });
  // Separate top-level from subcategories
  const topLevel = allCategories.filter((c) => c.parent_id === null);
  // No name filter — use the hierarchy transformer directly
  if (props.body.name === undefined) {
    return await ECommerceMallCategoryAtHierarchyTransformer.transform(
      topLevel,
    );
  }
  // With name filter: case-insensitive partial matching
  const searchName = props.body.name.toLowerCase();
  const matchingIds = new Set<string>();
  const parentIdsToInclude = new Set<string>();
  for (const cat of allCategories) {
    if (cat.name.toLowerCase().includes(searchName)) {
      matchingIds.add(cat.id);
      if (cat.parent_id !== null) {
        parentIdsToInclude.add(cat.parent_id);
      }
    }
  }
  // Include parent top-level categories of matching subcategories
  // to preserve the two-level hierarchy context for filtered views
  for (const pid of parentIdsToInclude) {
    matchingIds.add(pid);
  }
  // Build a quick lookup map for O(1) access
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));
  // Resolve parent into ISummary, using the in-memory data
  async function resolveParent(
    parentId: string | null,
  ): Promise<IECommerceMallCategory.ISummary | null> {
    if (parentId === null) return null;
    const record = categoriesById.get(parentId);
    if (record === undefined) return null;
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      parent: null,
      subcategories: [],
      products_count: record._count.products,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      deleted_at: record.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallCategory.ISummary;
  }
  // Recursively build hierarchy nodes
  async function buildNode(
    cat: (typeof allCategories)[number],
  ): Promise<IECommerceMallCategory.IHierarchyNode> {
    // Get matching subcategories for this parent
    const subcategories = allCategories.filter(
      (c) => c.parent_id === cat.id && matchingIds.has(c.id),
    );
    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      parent: await resolveParent(cat.parent_id),
      subcategories: await ArrayUtil.asyncMap(subcategories, buildNode),
      products_count: cat._count.products,
      created_at: cat.created_at.toISOString(),
      updated_at: cat.updated_at.toISOString(),
      deleted_at: cat.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallCategory.IHierarchyNode;
  }
  // Filter top-level categories to only matching ones
  const filteredTopLevel = topLevel.filter((c) => matchingIds.has(c.id));
  return {
    topLevelCategories: await ArrayUtil.asyncMap(filteredTopLevel, buildNode),
  } satisfies IECommerceMallCategory.IHierarchy;
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
// export async function patchECommerceMallSuperAdministratorCategoriesHierarchy(props: {
//   superAdministrator: SuperadministratorPayload;
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