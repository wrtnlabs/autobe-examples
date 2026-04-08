import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberAnalyticsTime(props: {
  member: MemberPayload;
  body: IErpHrmTimelog.IRequest & {
    groupBy?: "employee" | "project" | "task";
  };
}): Promise<IPageIErpHrmTimelog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const groupBy = props.body.groupBy ?? "employee";
  // Get employee's organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // Build base WHERE clause for organization scope
  const baseWhere: Prisma.erp_hrm_timelogsWhereInput = {
    employee: {
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
    },
    ...(props.body.date_from && {
      date: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to && {
      date: { lte: new Date(props.body.date_to) },
    }),
    ...(props.body.project_id && {
      erp_hrm_project_id: props.body.project_id,
    }),
    ...(props.body.task_id && {
      erp_hrm_task_id: props.body.task_id,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    ...(props.body.search && {
      description: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  if (groupBy === "employee") {
    const data = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["erp_hrm_employee_id"],
      where: baseWhere,
      _sum: { duration_minutes: true },
      _count: { _all: true },
      orderBy: { _sum: { duration_minutes: "desc" } },
    });
    const totalGroups = data.length;
    const paginatedData = data.slice((page - 1) * limit, page * limit);
    const results: IErpHrmTimelog.ISummary[] = [];
    for (const item of paginatedData) {
      const emp = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
        where: { id: item.erp_hrm_employee_id, deleted_at: null },
        ...ErpHrmEmployeeAtSummaryTransformer.select(),
      });
      const billableSum = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
        where: {
          ...baseWhere,
          erp_hrm_employee_id: item.erp_hrm_employee_id,
          billable: true,
        },
        _sum: { duration_minutes: true },
      });
      const totalMinutes = item._sum.duration_minutes ?? 0;
      const billableMinutes = billableSum._sum.duration_minutes ?? 0;
      results.push({
        groupBy: "employee" as const,
        totalMinutes: totalMinutes,
        billableMinutes: billableMinutes,
        nonBillableMinutes: totalMinutes - billableMinutes,
        timelogCount: item._count._all,
        employee: await ErpHrmEmployeeAtSummaryTransformer.transform(emp),
      });
    }
    return {
      data: results,
      pagination: {
        current: page,
        limit,
        records: totalGroups,
        pages: Math.ceil(totalGroups / limit),
      },
    };
  }
  if (groupBy === "project") {
    const data = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["erp_hrm_project_id"],
      where: baseWhere,
      _sum: { duration_minutes: true },
      _count: { _all: true },
      orderBy: { _sum: { duration_minutes: "desc" } },
    });
    const totalGroups = data.length;
    const paginatedData = data.slice((page - 1) * limit, page * limit);
    const results: IErpHrmTimelog.ISummary[] = [];
    for (const item of paginatedData) {
      const proj = await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
        where: { id: item.erp_hrm_project_id },
        ...ErpHrmProjectAtSummaryTransformer.select(),
      });
      const billableSum = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
        where: {
          ...baseWhere,
          erp_hrm_project_id: item.erp_hrm_project_id,
          billable: true,
        },
        _sum: { duration_minutes: true },
      });
      const totalMinutes = item._sum.duration_minutes ?? 0;
      const billableMinutes = billableSum._sum.duration_minutes ?? 0;
      results.push({
        groupBy: "project" as const,
        totalMinutes: totalMinutes,
        billableMinutes: billableMinutes,
        nonBillableMinutes: totalMinutes - billableMinutes,
        timelogCount: item._count._all,
        project: await ErpHrmProjectAtSummaryTransformer.transform(proj),
      });
    }
    return {
      data: results,
      pagination: {
        current: page,
        limit,
        records: totalGroups,
        pages: Math.ceil(totalGroups / limit),
      },
    };
  }
  // Group by task (exclude null task_id per spec)
  const taskWhere: Prisma.erp_hrm_timelogsWhereInput = {
    ...baseWhere,
    erp_hrm_task_id: { not: null },
  };
  const data = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["erp_hrm_task_id"],
    where: taskWhere,
    _sum: { duration_minutes: true },
    _count: { _all: true },
    orderBy: { _sum: { duration_minutes: "desc" } },
  });
  const totalGroups = data.length;
  const paginatedData = data.slice((page - 1) * limit, page * limit);
  const results: IErpHrmTimelog.ISummary[] = [];
  for (const item of paginatedData) {
    const taskId = item.erp_hrm_task_id;
    if (!taskId) continue;
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirstOrThrow({
      where: { id: taskId },
      ...ErpHrmTaskAtSummaryTransformer.select(),
    });
    const billableSum = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
      where: { ...taskWhere, erp_hrm_task_id: taskId, billable: true },
      _sum: { duration_minutes: true },
    });
    const totalMinutes = item._sum.duration_minutes ?? 0;
    const billableMinutes = billableSum._sum.duration_minutes ?? 0;
    results.push({
      groupBy: "task" as const,
      totalMinutes: totalMinutes,
      billableMinutes: billableMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      timelogCount: item._count._all,
      task: await ErpHrmTaskAtSummaryTransformer.transform(task),
    });
  }
  return {
    data: results,
    pagination: {
      current: page,
      limit,
      records: totalGroups,
      pages: Math.ceil(totalGroups / limit),
    },
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
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberAnalyticsTime(props: {
//   member: MemberPayload;
//   body: IErpHrmTimelog.IRequest;
// }): Promise<IPageIErpHrmTimelog.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------