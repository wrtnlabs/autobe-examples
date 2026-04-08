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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

type Int32Brand = number & {
  readonly __brand: "int32";
};
function toInt32(value: number): Int32Brand {
  return value as Int32Brand;
}
export async function patchErpHrmAdminAnalyticsTime(props: {
  admin: AdminPayload;
  body: IErpHrmTimelog.IRequest;
}): Promise<IPageIErpHrmTimelog.ISummary> {
  const page =
    props.body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<1>);
  const limit =
    props.body.limit ??
    (20 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>);
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.date_from ? { date: { gte: props.body.date_from } } : {}),
    ...(props.body.date_to ? { date: { lte: props.body.date_to } } : {}),
    ...(props.body.project_id
      ? { erp_hrm_project_id: props.body.project_id }
      : {}),
    ...(props.body.task_id ? { erp_hrm_task_id: props.body.task_id } : {}),
    ...(props.body.billable !== undefined
      ? { billable: props.body.billable }
      : {}),
    ...(props.body.search
      ? {
          description: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  } satisfies Prisma.erp_hrm_timelogsWhereInput;
  const employeeAggs = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["erp_hrm_employee_id"],
    where: whereInput,
    _sum: { duration_minutes: true },
    _count: { id: true },
  });
  const projectAggs = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["erp_hrm_project_id"],
    where: whereInput,
    _sum: { duration_minutes: true },
    _count: { id: true },
  });
  const taskAggs = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["erp_hrm_task_id"],
    where: {
      ...whereInput,
      erp_hrm_task_id: { not: null },
    },
    _sum: { duration_minutes: true },
    _count: { id: true },
  });
  const employeeBillableAggs =
    employeeAggs.length > 0
      ? await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
          by: ["erp_hrm_employee_id"],
          where: {
            ...whereInput,
            billable: true,
            erp_hrm_employee_id: {
              in: employeeAggs.map((e) => e.erp_hrm_employee_id),
            },
          },
          _sum: { duration_minutes: true },
        })
      : [];
  const projectBillableAggs =
    projectAggs.length > 0
      ? await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
          by: ["erp_hrm_project_id"],
          where: {
            ...whereInput,
            billable: true,
            erp_hrm_project_id: {
              in: projectAggs.map((p) => p.erp_hrm_project_id),
            },
          },
          _sum: { duration_minutes: true },
        })
      : [];
  const taskBillableAggs =
    taskAggs.length > 0
      ? await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
          by: ["erp_hrm_task_id"],
          where: {
            ...whereInput,
            billable: true,
            erp_hrm_task_id: { in: taskAggs.map((t) => t.erp_hrm_task_id!) },
          },
          _sum: { duration_minutes: true },
        })
      : [];
  const employeeBillableMap = new Map<string, number>(
    employeeBillableAggs.map((e) => [
      e.erp_hrm_employee_id,
      e._sum.duration_minutes ?? 0,
    ]),
  );
  const projectBillableMap = new Map<string, number>(
    projectBillableAggs.map((p) => [
      p.erp_hrm_project_id,
      p._sum.duration_minutes ?? 0,
    ]),
  );
  const taskBillableMap = new Map<string, number>(
    taskBillableAggs.map((t) => [
      t.erp_hrm_task_id!,
      t._sum.duration_minutes ?? 0,
    ]),
  );
  const [employeeRecords, projectRecords, taskRecords] = await Promise.all([
    employeeAggs.length > 0
      ? MyGlobal.prisma.erp_hrm_employees.findMany({
          where: { id: { in: employeeAggs.map((e) => e.erp_hrm_employee_id) } },
          ...ErpHrmEmployeeAtSummaryTransformer.select(),
        })
      : Promise.resolve([]),
    projectAggs.length > 0
      ? MyGlobal.prisma.erp_hrm_projects.findMany({
          where: { id: { in: projectAggs.map((p) => p.erp_hrm_project_id) } },
          select: {
            id: true,
            name: true,
            color: true,
            status: true,
            budget_hours: true,
            created_at: true,
            organization: {
              select: {
                id: true,
                name: true,
                currency: true,
                timezone: true,
                created_at: true,
                logo_uri: true,
                description: true,
                owner: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    avatar_uri: true,
                    phone: true,
                    created_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
            _count: { select: { timelogs: true } },
          },
        })
      : Promise.resolve([]),
    taskAggs.length > 0
      ? MyGlobal.prisma.erp_hrm_tasks.findMany({
          where: { id: { in: taskAggs.map((t) => t.erp_hrm_task_id!) } },
          ...ErpHrmTaskAtSummaryTransformer.select(),
        })
      : Promise.resolve([]),
  ]);
  const employeeMap = new Map(employeeRecords.map((e) => [e.id, e]));
  const projectMap = new Map(projectRecords.map((p) => [p.id, p]));
  const taskMap = new Map(taskRecords.map((t) => [t.id, t]));
  const summaries: IErpHrmTimelog.ISummary[] = [];
  for (const agg of employeeAggs) {
    const record = employeeMap.get(agg.erp_hrm_employee_id);
    if (!record) continue;
    const totalMinutes = agg._sum.duration_minutes ?? 0;
    const billableMinutes =
      employeeBillableMap.get(agg.erp_hrm_employee_id) ?? 0;
    const nonBillableMinutes = totalMinutes - billableMinutes;
    summaries.push({
      groupBy: "employee" as const,
      totalMinutes: toInt32(totalMinutes),
      billableMinutes: toInt32(billableMinutes),
      nonBillableMinutes: toInt32(nonBillableMinutes),
      timelogCount: toInt32(agg._count.id),
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(record),
    });
  }
  for (const agg of projectAggs) {
    const record = projectMap.get(agg.erp_hrm_project_id);
    if (!record) continue;
    const totalMinutes = agg._sum.duration_minutes ?? 0;
    const billableMinutes = projectBillableMap.get(agg.erp_hrm_project_id) ?? 0;
    const nonBillableMinutes = totalMinutes - billableMinutes;
    summaries.push({
      groupBy: "project" as const,
      totalMinutes: toInt32(totalMinutes),
      billableMinutes: toInt32(billableMinutes),
      nonBillableMinutes: toInt32(nonBillableMinutes),
      timelogCount: toInt32(agg._count.id),
      project: {
        id: record.id,
        name: record.name,
        color: record.color,
        status: record.status,
        budgetHours:
          record.budget_hours != null ? Number(record.budget_hours) : null,
        createdAt: record.created_at.toISOString(),
        organization: {
          id: record.organization.id,
          name: record.organization.name,
          currency: record.organization.currency,
          timezone: record.organization.timezone,
          created_at: record.organization.created_at.toISOString(),
          logo_uri: record.organization.logo_uri ?? null,
          description: record.organization.description ?? null,
          owner: {
            id: record.organization.owner.id,
            email: record.organization.owner.email,
            displayName: record.organization.owner.display_name,
            avatarUri: record.organization.owner.avatar_uri ?? null,
            phone: record.organization.owner.phone ?? null,
            createdAt: record.organization.owner.created_at.toISOString(),
            deletedAt:
              record.organization.owner.deleted_at?.toISOString() ?? null,
          } satisfies IErpHrmMember.ISummary,
        } satisfies IErpHrmOrganization.ISummary,
        totalTimelogsCount: toInt32(record._count.timelogs),
      } satisfies IErpHrmProject.ISummary,
    });
  }
  for (const agg of taskAggs) {
    const record = taskMap.get(agg.erp_hrm_task_id!);
    if (!record) continue;
    const totalMinutes = agg._sum.duration_minutes ?? 0;
    const billableMinutes = taskBillableMap.get(agg.erp_hrm_task_id!) ?? 0;
    const nonBillableMinutes = totalMinutes - billableMinutes;
    summaries.push({
      groupBy: "task" as const,
      totalMinutes: toInt32(totalMinutes),
      billableMinutes: toInt32(billableMinutes),
      nonBillableMinutes: toInt32(nonBillableMinutes),
      timelogCount: toInt32(agg._count.id),
      task: await ErpHrmTaskAtSummaryTransformer.transform(record),
    });
  }
  summaries.sort((a, b) => b.totalMinutes - a.totalMinutes);
  const total = summaries.length;
  const pagedData = summaries.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: toInt32(total),
      pages: toInt32(Math.ceil(total / limit)),
    } satisfies IPage.IPagination,
    data: pagedData,
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
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmAdminAnalyticsTime(props: {
//   admin: AdminPayload;
//   body: IErpHrmTimelog.IRequest;
// }): Promise<IPageIErpHrmTimelog.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------