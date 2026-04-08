import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployee.IRequest;
}): Promise<IPageIHrmPlatformEmployee.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      hrm_platform_member_id: props.member.id,
      expired_at: { gt: toISOStringSafe(new Date()) },
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    },
  });
  if (session === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  if (session.organization_id === null) {
    throw new HttpException("Organization context required", 400);
  }
  const whereInput: Prisma.hrm_platform_employeesWhereInput = {
    hrm_platform_organization_id: session.organization_id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.department_id !== undefined && {
      hrm_platform_department_id: props.body.department_id,
    }),
    ...(props.body.employee_code !== undefined && {
      employee_code: { contains: props.body.employee_code },
    }),
    ...(props.body.display_name !== undefined && {
      display_name: { contains: props.body.display_name },
    }),
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email },
    }),
    ...(props.body.job_level !== undefined && {
      job_level: props.body.job_level,
    }),
    ...(props.body.employment_type !== undefined && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.start_date_gte !== undefined && {
      start_date: { gte: props.body.start_date_gte },
    }),
    ...(props.body.start_date_lte !== undefined && {
      start_date: { lte: props.body.start_date_lte },
    }),
    ...(props.body.is_pending !== undefined && {
      is_pending: props.body.is_pending,
    }),
  } satisfies Prisma.hrm_platform_employeesWhereInput;
  const orderByInput = (
    props.body.sort === "created_at"
      ? { created_at: "asc" as const }
      : props.body.sort === "start_date"
        ? { start_date: "desc" as const }
        : props.body.sort === "status"
          ? { status: "asc" as const }
          : props.body.sort === "display_name"
            ? { display_name: "asc" as const }
            : { updated_at: "desc" as const }
  ) satisfies Prisma.hrm_platform_employeesOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_employees.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformEmployeeAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_employees.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformEmployeeAtSummaryTransformer.transform,
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
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberEmployees(props: {
//   member: MemberPayload;
//   body: IHrmPlatformEmployee.IRequest;
// }): Promise<IPageIHrmPlatformEmployee.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_employees.findMany({
//     ...HrmPlatformEmployeeAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformEmployeeAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------