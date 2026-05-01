import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogAtSummaryTransformer } from "../transformers/ErpHrmTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimelog.IRequest;
}): Promise<IPageIErpHrmTimelog.ISummary> {
  // Get session for organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  // Get employee record
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id ?? undefined,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  // Get role with permissions
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: employee.erp_hrm_role_id },
    select: {
      is_builtin: true,
      name: true,
      rolePermissions: {
        select: {
          permission: { select: { key: true } },
        },
      },
    },
  });
  // Check view-all-time permission
  const hasViewAllTime: boolean = role.is_builtin
    ? role.name === "Owner" || role.name === "Manager"
    : role.rolePermissions.some((rp) => rp.permission.key === "time:view_all");
  const { body } = props;
  const page: number = body.page ?? 1;
  const limit: number = body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  // Build where filter
  const whereInput: Prisma.erp_hrm_timelogsWhereInput = {
    deleted_at: null,
    employee_id:
      hasViewAllTime && body.employee_id ? body.employee_id : employee.id,
    ...(body.date_start !== undefined || body.date_end !== undefined
      ? {
          date: {
            ...(body.date_start !== undefined ? { gte: body.date_start } : {}),
            ...(body.date_end !== undefined ? { lte: body.date_end } : {}),
          },
        }
      : {}),
    ...(body.project_id !== undefined ? { project_id: body.project_id } : {}),
    ...(body.task_id !== undefined ? { task_id: body.task_id } : {}),
    ...(body.billable !== undefined ? { billable: body.billable } : {}),
    ...(body.search !== undefined
      ? {
          description: {
            contains: body.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };
  // Build sort order
  const sortFieldMap: Record<string, string> = {
    date: "date",
    duration_minutes: "duration_minutes",
    created_at: "created_at",
  };
  let orderBy: Prisma.erp_hrm_timelogsOrderByWithRelationInput[];
  if (body.sort && body.sort.length > 0) {
    orderBy = body.sort.map((s: string) => {
      const parts = s.split("_");
      const direction = parts.pop()!;
      const field = parts.join("_");
      return {
        [sortFieldMap[field]]: direction,
      } as Prisma.erp_hrm_timelogsOrderByWithRelationInput;
    });
  } else {
    orderBy = [{ date: "desc" as const }, { created_at: "desc" as const }];
  }
  // Execute paginated query (sequential await)
  const records = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimelogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmTimelogAtSummaryTransformer.transform,
    ),
  } satisfies IPageIErpHrmTimelog.ISummary;
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
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberTimelogs(props: {
//   member: MemberPayload;
//   body: IErpHrmTimelog.IRequest;
// }): Promise<IPageIErpHrmTimelog.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
//     ...ErpHrmTimelogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmTimelogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------