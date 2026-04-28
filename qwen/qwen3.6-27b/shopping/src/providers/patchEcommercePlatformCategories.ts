import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformCategoryAtSummaryTransformer } from "../transformers/EcommercePlatformCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCategories(props: {
  body: IEcommercePlatformCategory.IRequest;
}): Promise<IPageIEcommercePlatformCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_platform_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        name: { contains: props.body.search, mode: "insensitive" },
      }),
    ...(props.body.parentOnly === true && {
      parent_ecommerce_platform_category_id: null,
    }),
    ...(props.body.parentId !== undefined && {
      parent_ecommerce_platform_category_id: props.body.parentId,
    }),
  };
  const records = await MyGlobal.prisma.ecommerce_platform_categories.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommercePlatformCategoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_platform_categories.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await EcommercePlatformCategoryAtSummaryTransformer.transformAll(
      records,
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
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// import { IPageIEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCategory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCategories(props: {
//   body: IEcommercePlatformCategory.IRequest;
// }): Promise<IPageIEcommercePlatformCategory.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_categories.findMany({
//     ...EcommercePlatformCategoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await EcommercePlatformCategoryAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------