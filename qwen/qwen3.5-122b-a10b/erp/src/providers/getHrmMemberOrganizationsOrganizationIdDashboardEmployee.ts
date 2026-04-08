import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmEmployeeDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeDashboard";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmActiveTimerAtSummaryTransformer } from "../transformers/HrmActiveTimerAtSummaryTransformer";
import { HrmTaskAtSummaryTransformer } from "../transformers/HrmTaskAtSummaryTransformer";
import { HrmTimelogTransformer } from "../transformers/HrmTimelogTransformer";
import { HrmTimesheetTimelogAtSummaryTransformer } from "../transformers/HrmTimesheetTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationIdDashboardEmployee(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmEmployeeDashboard> {
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException(
      "Employee record not found in this organization",
      404,
    );
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee account is not active", 403);
  }
  const now = new Date();
  const todayStart = toISOStringSafe(new Date(now.setHours(0, 0, 0, 0)));
  const tomorrowStart = toISOStringSafe(
    new Date(now.setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000),
  );
  const hoursTodayResult = await MyGlobal.prisma.hrm_timelogs.aggregate({
    where: {
      hrm_employee_id: employee.id,
      date: {
        gte: todayStart,
        lt: tomorrowStart,
      },
      deleted_at: null,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const hoursToday: number = (hoursTodayResult._sum.duration_minutes ?? 0) / 60;
  const weekNow = new Date();
  const dayOfWeek = weekNow.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(weekNow);
  monday.setDate(monday.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const weekStart = toISOStringSafe(monday);
  const hoursThisWeekResult = await MyGlobal.prisma.hrm_timelogs.aggregate({
    where: {
      hrm_employee_id: employee.id,
      date: {
        gte: weekStart,
      },
      deleted_at: null,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const hoursThisWeek: number =
    (hoursThisWeekResult._sum.duration_minutes ?? 0) / 60;
  const activeTimerRecord = await MyGlobal.prisma.hrm_active_timers.findUnique({
    where: {
      employee_id: employee.id,
    },
    ...HrmActiveTimerAtSummaryTransformer.select(),
  });
  const activeTimer: IHrmActiveTimer.ISummary | null = activeTimerRecord
    ? await HrmActiveTimerAtSummaryTransformer.transform(activeTimerRecord)
    : null;
  const recentTimelogsRecords = await MyGlobal.prisma.hrm_timelogs.findMany({
    where: {
      hrm_employee_id: employee.id,
      deleted_at: null,
    },
    orderBy: { date: "desc" },
    take: 5,
    ...HrmTimelogTransformer.select(),
  });
  const recentTimelogs: IHrmTimelog.ISummary[] = await ArrayUtil.asyncMap(
    recentTimelogsRecords,
    async (record) => {
      return {
        total_hours: record.duration_minutes / 60,
        total_billable_hours: record.billable
          ? record.duration_minutes / 60
          : 0,
        total_non_billable_hours: record.billable
          ? 0
          : record.duration_minutes / 60,
        total_entries: 1,
        items: [],
        cursor: null,
      } satisfies IHrmTimelog.ISummary;
    },
  );
  const pendingTimesheetRecord = await MyGlobal.prisma.hrm_timesheets.findFirst(
    {
      where: {
        hrm_employee_id: employee.id,
        status: "submitted",
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      ...HrmTimesheetTimelogAtSummaryTransformer.select(),
    },
  );
  const pendingTimesheet: IHrmTimesheetTimelog.ISummary | null =
    pendingTimesheetRecord
      ? await HrmTimesheetTimelogAtSummaryTransformer.transform(
          pendingTimesheetRecord,
        )
      : null;
  const assignedTasksRecords = await MyGlobal.prisma.hrm_tasks.findMany({
    where: {
      assigned_employee_id: employee.id,
      status: { in: ["open", "in-progress"] },
      deleted_at: null,
    },
    ...HrmTaskAtSummaryTransformer.select(),
  });
  const assignedTasks: IHrmTask.ISummary[] =
    await HrmTaskAtSummaryTransformer.transformAll(assignedTasksRecords);
  return {
    hoursToday,
    hoursThisWeek,
    activeTimer,
    recentTimelogs,
    pendingTimesheet,
    assignedTasks,
  } satisfies IHrmEmployeeDashboard;
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
// import { IHrmEmployeeDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeDashboard";
// import { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
// import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
// import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdDashboardEmployee(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IHrmEmployeeDashboard> {
//   return {
//     hoursToday: ...,
//     hoursThisWeek: ...,
//     activeTimer: await HrmActiveTimerAtSummaryTransformer.transform(...),
//     recentTimelogs: ...,
//     pendingTimesheet: await HrmTimesheetTimelogAtSummaryTransformer.transform(...),
//     assignedTasks: await HrmTaskAtSummaryTransformer.transformAll(...),
//   };
// }
// ```
//--------------------------------------------------------------