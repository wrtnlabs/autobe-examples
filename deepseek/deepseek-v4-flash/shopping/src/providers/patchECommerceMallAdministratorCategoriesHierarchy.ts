import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallCategoryAtHierarchyTransformer } from "../transformers/ECommerceMallCategoryAtHierarchyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorCategoriesHierarchy(props: {
  administrator: AdministratorPayload;
  body: IECommerceMallCategory.IHierarchyRequest;
}): Promise<IECommerceMallCategory.IHierarchy> {
  const whereBase: Prisma.e_commerce_mall_categoriesWhereInput = {
    deleted_at: null,
  };
  // --- Optional name-based search filter ---
  let topLevelIds: string[] | undefined;
  if (props.body.name !== undefined) {
    const nameFilter: Prisma.e_commerce_mall_categoriesWhereInput = {
      ...whereBase,
      name: { contains: props.body.name, mode: "insensitive" },
    } satisfies Prisma.e_commerce_mall_categoriesWhereInput;
    const matchingCategories =
      await MyGlobal.prisma.e_commerce_mall_categories.findMany({
        where: nameFilter,
        select: { id: true, parent_id: true },
      });
    const parentIdsFromSubcategories: string[] = matchingCategories
      .filter(
        (
          c,
        ): c is typeof c & {
          parent_id: string;
        } => c.parent_id !== null,
      )
      .map((c) => c.parent_id);
    const matchingTopLevelIds: string[] = matchingCategories
      .filter((c) => c.parent_id === null)
      .map((c) => c.id);
    const combined: string[] = [
      ...matchingTopLevelIds,
      ...parentIdsFromSubcategories,
    ];
    topLevelIds = [...new Set(combined)];
    if (topLevelIds.length === 0) {
      return {
        topLevelCategories: [],
      } satisfies IECommerceMallCategory.IHierarchy;
    }
  }
  // --- Build top-level query ---
  const topLevelWhere: Prisma.e_commerce_mall_categoriesWhereInput = {
    ...whereBase,
    parent_id: null,
    ...(topLevelIds !== undefined ? { id: { in: topLevelIds } } : {}),
  } satisfies Prisma.e_commerce_mall_categoriesWhereInput;
  const topLevelCategories =
    await MyGlobal.prisma.e_commerce_mall_categories.findMany({
      ...ECommerceMallCategoryAtHierarchyTransformer.select(),
      where: topLevelWhere,
      orderBy: { created_at: "asc" },
    });
  // --- Transform using the Hierarchy transformer ---
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
// export async function patchECommerceMallAdministratorCategoriesHierarchy(props: {
//   administrator: AdministratorPayload;
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