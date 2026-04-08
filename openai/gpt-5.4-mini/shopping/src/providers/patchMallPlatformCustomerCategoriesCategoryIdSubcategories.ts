import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCategoryAtSummaryTransformer } from "../transformers/MallPlatformCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerCategoriesCategoryIdSubcategories(props: {
  customer: CustomerPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IMallPlatformCategory.IRequest;
}): Promise<IPageIMallPlatformCategory.ISummary> {
  await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const search = props.body.search;
  const where: Prisma.mall_platform_categoriesWhereInput = {
    parent_category_id: props.categoryId,
    deleted_at: null,
    ...(search === undefined
      ? {}
      : {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
  };
  const orderBy: Prisma.mall_platform_categoriesOrderByWithRelationInput[] =
    props.body.sort === "oldest"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "name_asc"
        ? [{ name: "asc" }, { id: "asc" }]
        : props.body.sort === "name_desc"
          ? [{ name: "desc" }, { id: "asc" }]
          : [{ created_at: "desc" }, { id: "asc" }];
  const records = await MyGlobal.prisma.mall_platform_categories.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...MallPlatformCategoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_categories.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await Promise.all(
      records.map((record) =>
        MallPlatformCategoryAtSummaryTransformer.transform(record),
      ),
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
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerCategoriesCategoryIdSubcategories(props: {
//   customer: CustomerPayload;
//   categoryId: string & tags.Format<"uuid">;
//   body: IMallPlatformCategory.IRequest;
// }): Promise<IPageIMallPlatformCategory.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_categories.findMany({
//     ...MallPlatformCategoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await MallPlatformCategoryAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------