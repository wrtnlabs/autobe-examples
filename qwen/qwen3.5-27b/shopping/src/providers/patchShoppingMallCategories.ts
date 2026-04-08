import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryAtSummaryTransformer } from "../transformers/ShoppingMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== undefined && {
        name: {
          contains: body.name,
          mode: "insensitive",
        },
      }),
    ...(body.description !== undefined && {
      description: {
        contains: body.description,
        mode: "insensitive",
      },
    }),
    ...(body.hasParent !== undefined && {
      parent_category_id: body.hasParent ? { not: null } : null,
    }),
    ...(body.parentId !== undefined && {
      parent_category_id: body.parentId,
    }),
  };
  const sortOrder: "asc" | "desc" = body.sortOrder === "DESC" ? "desc" : "asc";
  const sortByField = body.sortBy ?? "name";
  const orderByInput: Prisma.shopping_mall_categoriesOrderByWithRelationInput =
    sortByField === "name"
      ? { name: sortOrder }
      : sortByField === "created_at"
        ? { created_at: sortOrder }
        : sortByField === "updated_at"
          ? { updated_at: sortOrder }
          : { name: "asc" };
  const records = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallCategoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ShoppingMallCategoryAtSummaryTransformer.transformAll(records),
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
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCategories(props: {
//   body: IShoppingMallCategory.IRequest;
// }): Promise<IPageIShoppingMallCategory.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_categories.findMany({
//     ...ShoppingMallCategoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ShoppingMallCategoryAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------