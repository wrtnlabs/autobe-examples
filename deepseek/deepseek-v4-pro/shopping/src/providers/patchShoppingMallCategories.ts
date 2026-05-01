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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search?.trim()
      ? { name: { contains: props.body.search, mode: "insensitive" as const } }
      : {}),
    ...(props.body.parentId === null
      ? { parent_id: null }
      : props.body.parentId !== undefined
        ? { parent_id: props.body.parentId }
        : {}),
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  const sort = props.body.sort?.toLowerCase();
  let orderBy: Prisma.shopping_mall_categoriesOrderByWithRelationInput;
  if (sort === "name asc") {
    orderBy = { name: "asc" };
  } else if (sort === "name desc") {
    orderBy = { name: "desc" };
  } else if (sort === "created_at asc") {
    orderBy = { created_at: "asc" };
  } else if (sort === "created_at desc") {
    orderBy = { created_at: "desc" };
  } else if (sort === "updated_at asc") {
    orderBy = { updated_at: "asc" };
  } else if (sort === "updated_at desc") {
    orderBy = { updated_at: "desc" };
  } else {
    orderBy = { created_at: "desc" };
  }
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where: whereInput,
  });
  const data = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...ShoppingMallCategoryAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCategoryAtSummaryTransformer.transform,
    ),
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
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCategoryAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------