import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingEmployeeContractAtSummaryTransformer } from "../transformers/HrmTimeTrackingEmployeeContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingEmployeesEmployeeIdContracts(props: {
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.IRequest;
}): Promise<IPageIHrmTimeTrackingEmployeeContract.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_employee_contractsWhereInput = {
    hrm_time_tracking_employee_id: props.employeeId,
    deleted_at: null,
  };
  if (props.body.status === "active") {
    where.end_date = null;
  } else if (props.body.status === "past") {
    where.end_date = { not: null };
  }
  if (props.body.pay_period !== undefined) {
    where.pay_period = props.body.pay_period;
  }
  if (props.body.start_date_range !== undefined) {
    const startFilter: Record<string, string> = {};
    if (props.body.start_date_range.from !== undefined) {
      startFilter.gte = props.body.start_date_range.from;
    }
    if (props.body.start_date_range.to !== undefined) {
      startFilter.lte = props.body.start_date_range.to;
    }
    where.start_date = startFilter;
  }
  if (props.body.end_date_range !== undefined) {
    const endFilter: Record<string, string> = {};
    if (props.body.end_date_range.from !== undefined) {
      endFilter.gte = props.body.end_date_range.from;
    }
    if (props.body.end_date_range.to !== undefined) {
      endFilter.lte = props.body.end_date_range.to;
    }
    where.end_date = endFilter;
  }
  const records =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findMany({
      where,
      skip,
      take: limit,
      orderBy: { start_date: "desc" },
      ...HrmTimeTrackingEmployeeContractAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingEmployeeContractAtSummaryTransformer.transform,
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
// import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
// import { IPageIHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeContract";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingEmployeesEmployeeIdContracts(props: {
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingEmployeeContract.IRequest;
// }): Promise<IPageIHrmTimeTrackingEmployeeContract.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findMany({
//     ...HrmTimeTrackingEmployeeContractAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingEmployeeContractAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------