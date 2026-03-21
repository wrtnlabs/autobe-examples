import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeReport";
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

export async function patchErpHrmMemberReportsTime(props: {
  member: MemberPayload;
  body: IErpHrmTimeReport.IRequest;
}): Promise<IPageIErpHrmTimeReport.ISummary> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
    },
    select: { id: true, erp_hrm_role_id: true },
  });
  if (!employee) {
    throw new HttpException("Employee not found in organization", 403);
  }
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "report:view",
    },
  });
  if (!permission) {
    throw new HttpException("Forbidden - report:view permission required", 403);
  }
  const whereClause = {
    deleted_at: null,
    employee: {
      erp_hrm_organization_id: organizationId,
    },
    ...(props.body.from && {
      date: { gte: new Date(props.body.from) },
    }),
    ...(props.body.to && {
      date: { lte: new Date(props.body.to) },
    }),
    ...(props.body.employee_id && { employee_id: props.body.employee_id }),
    ...(props.body.project_id && { project_id: props.body.project_id }),
    ...(props.body.billable !== null &&
      props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
  } satisfies Prisma.erp_hrm_timelogsWhereInput;
  const groupBy = props.body.groupBy ?? "employee";
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  if (groupBy === "employee") {
    const groupedResults = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["employee_id"],
      where: whereClause,
      _sum: { duration: true },
      _count: { id: true },
      orderBy: { employee_id: "asc" },
      skip,
      take: limit,
    });
    const billableResults = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["employee_id"],
      where: { ...whereClause, billable: true },
      _sum: { duration: true },
    });
    const billableMap = new Map<string, number>();
    for (const result of billableResults) {
      billableMap.set(result.employee_id, result._sum.duration ?? 0);
    }
    const totalCount = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["employee_id"],
      where: whereClause,
    });
    const totalRecords = totalCount.length;
    const entries: IErpHrmTimeReport.ISummary[] = [];
    for (const result of groupedResults) {
      const totalMinutes = result._sum.duration ?? 0;
      const billableMinutes = billableMap.get(result.employee_id) ?? 0;
      const nonBillableMinutes = totalMinutes - billableMinutes;
      const emp = await MyGlobal.prisma.erp_hrm_employees.findUnique({
        where: { id: result.employee_id },
        ...ErpHrmEmployeeAtSummaryTransformer.select(),
      });
      entries.push({
        groupBy: "employee",
        employee: emp
          ? await ErpHrmEmployeeAtSummaryTransformer.transform(emp)
          : null,
        project: null,
        task: null,
        totalHours: totalMinutes / 60,
        billableHours: billableMinutes / 60,
        nonBillableHours: nonBillableMinutes / 60,
        timelogCount: result._count.id,
      });
    }
    return {
      pagination: {
        current: page,
        limit,
        records: totalRecords,
        pages: Math.ceil(totalRecords / limit),
      } satisfies IPage.IPagination,
      data: entries,
    };
  }
  if (groupBy === "project") {
    const groupedResults = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["project_id"],
      where: whereClause,
      _sum: { duration: true },
      _count: { id: true },
      orderBy: { project_id: "asc" },
      skip,
      take: limit,
    });
    const billableResults = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["project_id"],
      where: { ...whereClause, billable: true },
      _sum: { duration: true },
    });
    const billableMap = new Map<string, number>();
    for (const result of billableResults) {
      billableMap.set(result.project_id, result._sum.duration ?? 0);
    }
    const totalCount = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
      by: ["project_id"],
      where: whereClause,
    });
    const totalRecords = totalCount.length;
    const entries: IErpHrmTimeReport.ISummary[] = [];
    for (const result of groupedResults) {
      const totalMinutes = result._sum.duration ?? 0;
      const billableMinutes = billableMap.get(result.project_id) ?? 0;
      const nonBillableMinutes = totalMinutes - billableMinutes;
      const proj = await MyGlobal.prisma.erp_hrm_projects.findUnique({
        where: { id: result.project_id },
        ...ErpHrmProjectAtSummaryTransformer.select(),
      });
      entries.push({
        groupBy: "project",
        employee: null,
        project: proj
          ? await ErpHrmProjectAtSummaryTransformer.transform(proj)
          : null,
        task: null,
        totalHours: totalMinutes / 60,
        billableHours: billableMinutes / 60,
        nonBillableHours: nonBillableMinutes / 60,
        timelogCount: result._count.id,
      });
    }
    return {
      pagination: {
        current: page,
        limit,
        records: totalRecords,
        pages: Math.ceil(totalRecords / limit),
      } satisfies IPage.IPagination,
      data: entries,
    };
  }
  // groupBy === "task"
  const taskFilterWhere = { ...whereClause, task_id: { not: null } };
  const groupedResults = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["task_id"],
    where: taskFilterWhere,
    _sum: { duration: true },
    _count: { id: true },
    orderBy: { task_id: "asc" },
    skip,
    take: limit,
  });
  const billableResults = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["task_id"],
    where: { ...taskFilterWhere, billable: true },
    _sum: { duration: true },
  });
  const billableMap = new Map<string, number>();
  for (const result of billableResults) {
    billableMap.set(result.task_id!, result._sum.duration ?? 0);
  }
  const totalCount = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["task_id"],
    where: taskFilterWhere,
  });
  const totalRecords = totalCount.length;
  const entries: IErpHrmTimeReport.ISummary[] = [];
  for (const result of groupedResults) {
    const totalMinutes = result._sum.duration ?? 0;
    const billableMinutes = billableMap.get(result.task_id!) ?? 0;
    const nonBillableMinutes = totalMinutes - billableMinutes;
    const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: result.task_id! },
      ...ErpHrmTaskAtSummaryTransformer.select(),
    });
    entries.push({
      groupBy: "task",
      employee: null,
      project: null,
      task: task ? await ErpHrmTaskAtSummaryTransformer.transform(task) : null,
      totalHours: totalMinutes / 60,
      billableHours: billableMinutes / 60,
      nonBillableHours: nonBillableMinutes / 60,
      timelogCount: result._count.id,
    });
  }
  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
    data: entries,
  };
}
