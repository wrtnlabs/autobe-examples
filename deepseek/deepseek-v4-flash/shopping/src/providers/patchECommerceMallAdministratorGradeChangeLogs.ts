import { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminGradeChangeLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallAdminGradeChangeLogAtSummaryTransformer } from "../transformers/ECommerceMallAdminGradeChangeLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorGradeChangeLogs(props: {
  administrator: AdministratorPayload;
  body: IECommerceMallAdminGradeChangeLog.IRequest;
}): Promise<IPageIECommerceMallAdminGradeChangeLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Determine if current administrator is a super administrator
  const superAdmin =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findUnique({
      where: { e_commerce_mall_administrator_id: props.administrator.id },
      select: { id: true },
    });
  const isSuperAdmin = superAdmin !== null;
  // Build WHERE clause
  const where: Prisma.e_commerce_mall_admin_grade_change_logsWhereInput = {};
  if (isSuperAdmin) {
    // Super administrators can filter by target administrator
    if (props.body.administratorId !== undefined) {
      where.administrator_id = props.body.administratorId;
    }
  } else {
    // Regular administrators can only see their own grade changes
    where.administrator_id = props.administrator.id;
  }
  if (props.body.superAdministratorId !== undefined) {
    where.super_administrator_id = props.body.superAdministratorId;
  }
  if (props.body.previousGrade !== undefined) {
    where.previous_grade = props.body.previousGrade;
  }
  if (props.body.newGrade !== undefined) {
    where.new_grade = props.body.newGrade;
  }
  // Build date range filter using ISO datetime strings (no Date type)
  if (props.body.fromDate !== undefined || props.body.toDate !== undefined) {
    where.created_at = {
      ...(props.body.fromDate !== undefined && { gte: props.body.fromDate }),
      ...(props.body.toDate !== undefined && { lt: props.body.toDate }),
    };
  }
  const records =
    await MyGlobal.prisma.e_commerce_mall_admin_grade_change_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallAdminGradeChangeLogAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.e_commerce_mall_admin_grade_change_logs.count({
      where,
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
      ECommerceMallAdminGradeChangeLogAtSummaryTransformer.transform,
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
// import { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
// import { IPageIECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminGradeChangeLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorGradeChangeLogs(props: {
//   administrator: AdministratorPayload;
//   body: IECommerceMallAdminGradeChangeLog.IRequest;
// }): Promise<IPageIECommerceMallAdminGradeChangeLog.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_admin_grade_change_logs.findMany({
//     ...ECommerceMallAdminGradeChangeLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallAdminGradeChangeLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------