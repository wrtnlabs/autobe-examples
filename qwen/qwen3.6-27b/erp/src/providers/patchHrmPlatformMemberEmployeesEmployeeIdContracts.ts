import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeContractAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeContract.IRequest;
}): Promise<IPageIHrmPlatformEmployeeContract.ISummary> {
  // Fetch employee for authorization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        hrm_platform_organization_id: true,
        hrm_platform_member_id: true,
      },
    });
  // Authorization: allow if member is the employee or has employee:manage permission
  if (employee.hrm_platform_member_id !== props.member.id) {
    const authorized =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          permission_key: "employee:manage",
          role: {
            hrm_platform_organization_id: employee.hrm_platform_organization_id,
            employees: {
              some: {
                hrm_platform_member_id: props.member.id,
                deleted_at: null,
              },
            },
          },
        },
      });
    if (authorized === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Pagination
  const page = Math.max(props.body.page ?? 1, 1);
  const limit = Math.max(props.body.limit ?? 100, 1);
  const skip = (page - 1) * limit;
  // Build start_date filter (non-nullable DateTime)
  const startDateFilter: Prisma.DateTimeFilter = {};
  if (props.body.startDateFrom !== undefined) {
    startDateFilter.gte = new Date(props.body.startDateFrom);
  }
  if (props.body.startDateTo !== undefined) {
    startDateFilter.lte = new Date(props.body.startDateTo);
  }
  // Build end_date filter (nullable DateTime)
  const endDateFilter: Prisma.DateTimeNullableFilter = {};
  if (props.body.status === "active") {
    endDateFilter.equals = null;
  } else if (props.body.status === "past") {
    endDateFilter.not = null;
    if (props.body.endDateFrom !== undefined) {
      endDateFilter.gte = new Date(props.body.endDateFrom);
    }
    if (props.body.endDateTo !== undefined) {
      endDateFilter.lte = new Date(props.body.endDateTo);
    }
  } else {
    if (props.body.endDateFrom !== undefined) {
      endDateFilter.gte = new Date(props.body.endDateFrom);
    }
    if (props.body.endDateTo !== undefined) {
      endDateFilter.lte = new Date(props.body.endDateTo);
    }
  }
  const hasStartDateFilter =
    props.body.startDateFrom !== undefined ||
    props.body.startDateTo !== undefined;
  const hasEndDateFilter =
    props.body.status !== undefined ||
    props.body.endDateFrom !== undefined ||
    props.body.endDateTo !== undefined;
  // Build where clause
  const whereInput: Prisma.hrm_platform_employee_contractsWhereInput = {
    hrm_platform_employee_id: props.employeeId,
    ...(props.body.includeInactive === false && { deleted_at: null }),
    ...(props.body.payPeriod !== undefined && {
      pay_period: props.body.payPeriod,
    }),
    ...(hasStartDateFilter && { start_date: startDateFilter }),
    ...(hasEndDateFilter && { end_date: endDateFilter }),
  };
  // Build orderBy from sort parameter
  const sortParam = props.body.sort ?? "start_date_DESC";
  const isDesc = sortParam.endsWith("_DESC");
  const isAsc = sortParam.endsWith("_ASC");
  const sortField = isDesc
    ? sortParam.slice(0, -5)
    : isAsc
      ? sortParam.slice(0, -4)
      : sortParam;
  const sortDirection: "asc" | "desc" = isDesc
    ? "desc"
    : isAsc
      ? "asc"
      : "desc";
  const orderByInput: Prisma.hrm_platform_employee_contractsOrderByWithRelationInput =
    sortField === "start_date"
      ? { start_date: sortDirection }
      : sortField === "end_date"
        ? { end_date: sortDirection }
        : sortField === "pay_rate"
          ? { pay_rate: sortDirection }
          : sortField === "pay_period"
            ? { pay_period: sortDirection }
            : sortField === "working_hours_per_week"
              ? { working_hours_per_week: sortDirection }
              : sortField === "notes"
                ? { notes: sortDirection }
                : sortField === "created_at"
                  ? { created_at: sortDirection }
                  : sortField === "updated_at"
                    ? { updated_at: sortDirection }
                    : sortField === "deleted_at"
                      ? { deleted_at: sortDirection }
                      : sortField === "id"
                        ? { id: sortDirection }
                        : { start_date: "desc" };
  // Fetch paginated contracts
  const records =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformEmployeeContractAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_platform_employee_contracts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformEmployeeContractAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformEmployeeContract.ISummary;
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
// import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
// import { IPageIHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeContract";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmPlatformEmployeeContract.IRequest;
// }): Promise<IPageIHrmPlatformEmployeeContract.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_employee_contracts.findMany({
//     ...HrmPlatformEmployeeContractAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformEmployeeContractAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------