import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallCategoryAtSummaryTransformer } from "../transformers/ECommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IECommerceMallCategory.IRequest;
}): Promise<IPageIECommerceMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_categoriesWhereInput = {};
  if (!props.body.include_deleted) {
    where.deleted_at = null;
  }
  if (props.body.search) {
    where.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.parent_id !== undefined) {
    where.parent_id = props.body.parent_id;
  }
  const records = await MyGlobal.prisma.e_commerce_mall_categories.findMany({
    ...ECommerceMallCategoryAtSummaryTransformer.select(),
    where,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
  });
  const total = await MyGlobal.prisma.e_commerce_mall_categories.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ECommerceMallCategoryAtSummaryTransformer.transformAll(records),
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
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IPageIECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCategory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorCategories(props: {
//   administrator: AdministratorPayload;
//   body: IECommerceMallCategory.IRequest;
// }): Promise<IPageIECommerceMallCategory.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_categories.findMany({
//     ...ECommerceMallCategoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ECommerceMallCategoryAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------