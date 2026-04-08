import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorGradeChangeAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorGradeChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorGradeChanges(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorGradeChange.IRequest;
}): Promise<IPageIShoppingMallAdministratorGradeChange.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.shopping_mall_administrator_grade_changesWhereInput =
    {};
  if (props.body.administratorId !== undefined) {
    whereInput.administrator_id = props.body.administratorId;
  }
  if (props.body.performedById !== undefined) {
    whereInput.performed_by_id = props.body.performedById;
  }
  if (props.body.previousGrade !== undefined) {
    whereInput.previous_grade = props.body.previousGrade;
  }
  if (props.body.newGrade !== undefined) {
    whereInput.new_grade = props.body.newGrade;
  }
  if (props.body.changeType !== undefined) {
    whereInput.change_type = props.body.changeType;
  }
  if (props.body.dateRange !== undefined) {
    const dateFilters: Prisma.DateTimeFilter = {};
    if (props.body.dateRange.from !== undefined) {
      dateFilters.gte = new Date(props.body.dateRange.from);
    }
    if (props.body.dateRange.to !== undefined) {
      dateFilters.lte = new Date(props.body.dateRange.to);
    }
    whereInput.created_at = dateFilters;
  }
  // Parse sort parameter
  const sort = props.body.sort ?? "created_at:desc";
  const [sortField, sortDirection] = sort.split(":");
  const orderByInput: Prisma.shopping_mall_administrator_grade_changesOrderByWithRelationInput =
    {
      [sortField]: sortDirection === "asc" ? "asc" : "desc",
    };
  // Fetch records
  const records =
    await MyGlobal.prisma.shopping_mall_administrator_grade_changes.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallAdministratorGradeChangeAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.shopping_mall_administrator_grade_changes.count({
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
      ShoppingMallAdministratorGradeChangeAtSummaryTransformer.transform,
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
// import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
// import { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdministratorGradeChanges(props: {
//   administrator: AdministratorPayload;
//   body: IShoppingMallAdministratorGradeChange.IRequest;
// }): Promise<IPageIShoppingMallAdministratorGradeChange.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_administrator_grade_changes.findMany({
//     ...ShoppingMallAdministratorGradeChangeAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdministratorGradeChangeAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------