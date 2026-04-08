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
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCategories(props: {
  body: IEcommerceMallCategory.IRequest;
}): Promise<IPageIEcommerceMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.name !== undefined && {
      name: { contains: `%${props.body.name}%`, mode: "insensitive" as const },
    }),
    ...(props.body.parent_id !== undefined &&
      props.body.parent_id !== null && {
        parent_id: props.body.parent_id,
      }),
    ...(props.body.sort_order !== undefined &&
      props.body.sort_order !== null && {
        sort_order: props.body.sort_order,
      }),
  } satisfies Prisma.ecommerce_mall_categoriesWhereInput;
  const orderByInput = (
    props.body.sort === "name"
      ? { name: (props.body.order ?? "asc") as "asc" | "desc" }
      : props.body.sort === "created_at"
        ? { created_at: (props.body.order ?? "asc") as "asc" | "desc" }
        : props.body.sort === "updated_at"
          ? { updated_at: (props.body.order ?? "asc") as "asc" | "desc" }
          : { sort_order: (props.body.order ?? "asc") as "asc" | "desc" }
  ) satisfies Prisma.ecommerce_mall_categoriesOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallCategoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_categories.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await EcommerceMallCategoryAtSummaryTransformer.transformAll(data),
  } satisfies IPageIEcommerceMallCategory.ISummary;
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
// }): Promise<IPageIEcommerceMallCategory.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
//     ...EcommerceMallCategoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await EcommerceMallCategoryAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------