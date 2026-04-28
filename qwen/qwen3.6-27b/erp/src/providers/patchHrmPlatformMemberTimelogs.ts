import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogAtSummaryTransformer } from "../transformers/HrmPlatformTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.IRequest;
}): Promise<IPageIHrmPlatformTimelog.ISummary> {
  // Resolve authenticated member's employee record with role information
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: props.member.session_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_role_id: true,
      },
    });
  // Check if member has time:manage permission
  const permission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.hrm_platform_role_id,
        permission_key: "time:manage",
      },
      select: {
        id: true,
      },
    });
  const hasTimeManagePermission: boolean = permission !== null;
  // Pagination defaults
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Build where clause with authorization scoping
  const baseWhere: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
    ...(hasTimeManagePermission
      ? {
          // Scope to entire organization via employee relation
          employee: {
            hrm_platform_organization_id: props.member.session_id,
          },
        }
      : {
          // Scope to own timelogs only
          hrm_platform_employee_id: employee.id,
        }),
  };
  // Apply date and scalar filters, preserving base where
  const where: Prisma.hrm_platform_timelogsWhereInput = {
    ...baseWhere,
    ...(props.body.date_from !== undefined
      ? { date: { gte: props.body.date_from } }
      : {}),
    ...(props.body.date_to !== undefined
      ? { date: { lte: props.body.date_to } }
      : {}),
    ...(props.body.project_id !== undefined
      ? { hrm_platform_project_id: props.body.project_id }
      : {}),
    ...(props.body.task_id !== undefined
      ? { hrm_platform_task_id: props.body.task_id }
      : {}),
    ...(props.body.billable !== undefined && props.body.billable !== null
      ? { billable: props.body.billable }
      : {}),
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          work_description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  };
  // Dynamic sort: defaults to 'date desc'
  const parseSortField =
    (): Prisma.hrm_platform_timelogsOrderByWithRelationInput => {
      const sortString: string = props.body.sort ?? "date desc";
      const parts: string[] = sortString.split(" ");
      const field: string = parts[0];
      const direction: "asc" | "desc" = parts[1] === "asc" ? "asc" : "desc";
      if (field === "duration_minutes") {
        return { duration_minutes: direction };
      }
      if (field === "created_at") {
        return { created_at: direction };
      }
      return { date: direction };
    };
  const orderByInput: Prisma.hrm_platform_timelogsOrderByWithRelationInput =
    parseSortField();
  // Fetch paginated records with transformer select
  const records = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTimelogAtSummaryTransformer.select(),
  });
  // Count total matching records for pagination metadata
  const total: number = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where,
  });
  // Transform records using transformer
  const data = await ArrayUtil.asyncMap(
    records,
    HrmPlatformTimelogAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
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
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTimelogs(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimelog.IRequest;
// }): Promise<IPageIHrmPlatformTimelog.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
//     ...HrmPlatformTimelogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformTimelogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------