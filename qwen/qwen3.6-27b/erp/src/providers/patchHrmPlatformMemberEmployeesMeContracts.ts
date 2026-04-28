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

export async function patchHrmPlatformMemberEmployeesMeContracts(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployeeContract.IRequest;
}): Promise<IPageIHrmPlatformEmployeeContract.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build status filter (mutually exclusive with date range filters)
  const statusFilter =
    props.body.status === "active"
      ? { end_date: { equals: null } as const }
      : props.body.status === "past"
        ? { NOT: { end_date: null } as const }
        : undefined;
  // Build date range filters (only when no status filter is set)
  const startDateRange =
    statusFilter === undefined
      ? props.body.startDateFrom !== undefined &&
        props.body.startDateTo !== undefined
        ? { gte: props.body.startDateFrom, lte: props.body.startDateTo }
        : props.body.startDateFrom !== undefined
          ? { gte: props.body.startDateFrom }
          : props.body.startDateTo !== undefined
            ? { lte: props.body.startDateTo }
            : undefined
      : undefined;
  const endDateRange =
    statusFilter === undefined
      ? props.body.endDateFrom !== undefined &&
        props.body.endDateTo !== undefined
        ? { gte: props.body.endDateFrom, lte: props.body.endDateTo }
        : props.body.endDateFrom !== undefined
          ? { gte: props.body.endDateFrom }
          : props.body.endDateTo !== undefined
            ? { lte: props.body.endDateTo }
            : undefined
      : undefined;
  const whereInput: Prisma.hrm_platform_employee_contractsWhereInput = {
    hrm_platform_employee_id: employee.id,
    ...(props.body.includeInactive !== true && { deleted_at: null }),
    ...(props.body.payPeriod !== undefined && {
      pay_period: props.body.payPeriod,
    }),
    ...statusFilter,
    ...(startDateRange !== undefined && { start_date: startDateRange }),
    ...(endDateRange !== undefined && { end_date: endDateRange }),
  } satisfies Prisma.hrm_platform_employee_contractsWhereInput;
  const orderByInput: Prisma.hrm_platform_employee_contractsOrderByWithRelationInput =
    props.body.sort !== undefined
      ? (() => {
          const idx = props.body.sort.lastIndexOf("_");
          const dir =
            idx > 0 && props.body.sort.slice(idx + 1).toLowerCase() === "asc"
              ? "asc"
              : "desc";
          const field =
            idx > 0 ? props.body.sort.slice(0, idx) : props.body.sort;
          return { [field]: dir };
        })()
      : { start_date: "desc" };
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
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformEmployeeContractAtSummaryTransformer.transform,
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
// import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
// import { IPageIHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeContract";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberEmployeesMeContracts(props: {
//   member: MemberPayload;
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