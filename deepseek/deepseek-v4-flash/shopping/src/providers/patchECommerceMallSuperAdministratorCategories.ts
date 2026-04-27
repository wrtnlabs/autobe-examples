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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallCategoryAtSummaryTransformer } from "../transformers/ECommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchECommerceMallSuperAdministratorCategories(props: {
  superAdministrator: SuperadministratorPayload;
  body: IECommerceMallCategory.IRequest;
}): Promise<IPageIECommerceMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.search
      ? { name: { contains: props.body.search, mode: "insensitive" } }
      : {}),
    ...(props.body.parent_id !== undefined
      ? { parent_id: props.body.parent_id }
      : {}),
    ...(props.body.include_deleted !== true ? { deleted_at: null } : {}),
  } satisfies Prisma.e_commerce_mall_categoriesWhereInput;
  const orderBy = {
    created_at: "desc",
  } satisfies Prisma.e_commerce_mall_categoriesOrderByWithRelationInput;
  const records = await MyGlobal.prisma.e_commerce_mall_categories.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ECommerceMallCategoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.e_commerce_mall_categories.count({
    where,
  });
  return {
    data: await ECommerceMallCategoryAtSummaryTransformer.transformAll(records),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// export async function patchECommerceMallSuperAdministratorCategories(props: {
//   superAdministrator: SuperadministratorPayload;
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