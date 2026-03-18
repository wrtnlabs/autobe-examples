import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectTimeAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTimeAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdAnalyticsTime(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectTimeAnalytic.IRequest;
}): Promise<IHrmPlatformProjectTimeAnalytic> {
  // Verify project exists and get organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId, deleted_at: null },
      select: { id: true, organization_id: true },
    },
  );
  // Verify member is an employee in this organization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: { id: true, role_id: true },
    });
  // Verify member has report:view permission
  const permissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        role_id: employee.role_id,
        permission: "report:view",
      },
    });
  if (permissions.length === 0) {
    throw new HttpException("Forbidden: Missing report:view permission", 403);
  }
  // Build WHERE clause from filters
  const whereInput: Prisma.hrm_platform_timelogsWhereInput = {
    project_id: props.projectId,
    deleted_at: null,
    ...(props.body.fromDate && {
      date: { gte: new Date(props.body.fromDate) },
    }),
    ...(props.body.toDate && { date: { lte: new Date(props.body.toDate) } }),
    ...(props.body.employeeIds &&
      props.body.employeeIds.length > 0 && {
        employee_id: { in: props.body.employeeIds },
      }),
    ...(props.body.taskIds &&
      props.body.taskIds.length > 0 && {
        task_id: { in: props.body.taskIds },
      }),
    ...(props.body.billable !== undefined && { billable: props.body.billable }),
  } satisfies Prisma.hrm_platform_timelogsWhereInput;
  // Get total minutes
  const totalAggregate = await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
    where: whereInput,
    _sum: { duration_minutes: true },
  });
  const totalMinutesValue = totalAggregate._sum.duration_minutes ?? 0;
  const totalMinutes = totalMinutesValue as unknown as number &
    tags.Type<"int32">;
  const totalHours = totalMinutesValue / 60.0;
  // Get employee breakdown
  const employeeBreakdownRaw =
    await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["employee_id"],
      where: whereInput,
      _sum: { duration_minutes: true },
    });
  const employeeBreakdown: IHrmPlatformProjectTimeAnalytic.IEmployeeBreakdown[] =
    await ArrayUtil.asyncMap(employeeBreakdownRaw, async (eb) => {
      const emp =
        await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
          where: { id: eb.employee_id },
          select: { display_name: true },
        });
      const empTotalMinutesValue = eb._sum.duration_minutes ?? 0;
      const empTotalMinutes = empTotalMinutesValue as unknown as number &
        tags.Type<"int32">;
      return {
        employee_id: eb.employee_id as unknown as string & tags.Format<"uuid">,
        name: emp.display_name,
        avatar_url: null,
        totalMinutes: empTotalMinutes,
        totalHours: empTotalMinutesValue / 60.0,
      } satisfies IHrmPlatformProjectTimeAnalytic.IEmployeeBreakdown;
    });
  // Get task breakdown
  const taskBreakdownRaw = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
    by: ["task_id"],
    where: whereInput,
    _sum: { duration_minutes: true },
  });
  const taskBreakdown: IHrmPlatformProjectTimeAnalytic.ITaskBreakdown[] =
    await ArrayUtil.asyncMap(taskBreakdownRaw, async (tb) => {
      let title = "Unassigned";
      if (tb.task_id !== null) {
        const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
          where: { id: tb.task_id },
          select: { title: true },
        });
        if (task !== null) {
          title = task.title;
        }
      }
      const taskTotalMinutesValue = tb._sum.duration_minutes ?? 0;
      const taskTotalMinutes = taskTotalMinutesValue as unknown as number &
        tags.Type<"int32">;
      return {
        task_id: tb.task_id as unknown as (string & tags.Format<"uuid">) | null,
        title,
        totalMinutes: taskTotalMinutes,
        totalHours: taskTotalMinutesValue / 60.0,
      } satisfies IHrmPlatformProjectTimeAnalytic.ITaskBreakdown;
    });
  // Get daily breakdown
  const dailyBreakdownRaw = await MyGlobal.prisma.hrm_platform_timelogs.groupBy(
    {
      by: ["date"],
      where: whereInput,
      _sum: { duration_minutes: true },
      orderBy: { date: "asc" },
    },
  );
  const dailyBreakdown: IHrmPlatformProjectTimeAnalytic.IDailyBreakdown[] =
    dailyBreakdownRaw.map((db) => {
      const dayTotalMinutesValue = db._sum.duration_minutes ?? 0;
      const dayTotalMinutes = dayTotalMinutesValue as unknown as number &
        tags.Type<"int32">;
      return {
        date: toISOStringSafe(db.date).split("T")[0] as unknown as string &
          tags.Format<"date">,
        totalMinutes: dayTotalMinutes,
        totalHours: dayTotalMinutesValue / 60.0,
      } satisfies IHrmPlatformProjectTimeAnalytic.IDailyBreakdown;
    });
  // Get billable breakdown
  const billableBreakdownRaw =
    await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
      by: ["billable"],
      where: whereInput,
      _sum: { duration_minutes: true },
    });
  let billableMinutesValue = 0;
  let nonBillableMinutesValue = 0;
  for (const bb of billableBreakdownRaw) {
    const sum = bb._sum.duration_minutes ?? 0;
    if (bb.billable === true) {
      billableMinutesValue = sum;
    } else {
      nonBillableMinutesValue = sum;
    }
  }
  const billableMinutes = billableMinutesValue as unknown as number &
    tags.Type<"int32">;
  const nonBillableMinutes = nonBillableMinutesValue as unknown as number &
    tags.Type<"int32">;
  const billableBreakdown: IHrmPlatformProjectTimeAnalytic.IBillableBreakdown =
    {
      billableMinutes,
      nonBillableMinutes,
      billableHours: billableMinutesValue / 60.0,
      nonBillableHours: nonBillableMinutesValue / 60.0,
    } satisfies IHrmPlatformProjectTimeAnalytic.IBillableBreakdown;
  // Get date range
  const dateRangeAggregate =
    await MyGlobal.prisma.hrm_platform_timelogs.aggregate({
      where: whereInput,
      _min: { date: true },
      _max: { date: true },
    });
  const dateRange: IHrmPlatformProjectTimeAnalytic.IDateRange = {
    fromDate: dateRangeAggregate._min.date
      ? (toISOStringSafe(dateRangeAggregate._min.date).split(
          "T",
        )[0] as unknown as string & tags.Format<"date">)
      : null,
    toDate: dateRangeAggregate._max.date
      ? (toISOStringSafe(dateRangeAggregate._max.date).split(
          "T",
        )[0] as unknown as string & tags.Format<"date">)
      : null,
  } satisfies IHrmPlatformProjectTimeAnalytic.IDateRange;
  return {
    totalHours,
    totalMinutes,
    employeeBreakdown,
    taskBreakdown,
    dailyBreakdown,
    billableBreakdown,
    dateRange,
  } satisfies IHrmPlatformProjectTimeAnalytic;
}
