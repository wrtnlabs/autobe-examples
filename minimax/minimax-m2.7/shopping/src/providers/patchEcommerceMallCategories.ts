import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCategories(props: {
  body: IEcommerceMallCategory.IRequest;
}): Promise<IPageIEcommerceMallCategory> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = props.body.offset ?? (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.name && {
      name: {
        contains: props.body.name,
        mode: Prisma.QueryMode.insensitive,
      },
    }),
    ...(props.body.onlyParents === true && {
      parent_id: null,
    }),
    ...(props.body.parentId && {
      parent_id: props.body.parentId,
    }),
  } satisfies Prisma.ecommerce_mall_categoriesWhereInput;
  const records = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: whereInput,
    take: limit,
    skip: offset,
    orderBy: { created_at: "desc" },
    ...EcommerceMallCategoryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_categories.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallCategoryTransformer.transform,
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
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCategories(props: {
//   body: IEcommerceMallCategory.IRequest;
// }): Promise<IPageIEcommerceMallCategory> {
//   const records = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
//     ...EcommerceMallCategoryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCategoryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------