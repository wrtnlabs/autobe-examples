import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPersonalDashboard";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { ErpHrmTimelogAtSummaryTransformer } from "../transformers/ErpHrmTimelogAtSummaryTransformer";
import { ErpHrmTimerAtSummaryTransformer } from "../transformers/ErpHrmTimerAtSummaryTransformer";
import { ErpHrmTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberDashboardsPersonal(props: {
  member: MemberPayload;
}): Promise<IErpHrmPersonalDashboard> {
  // Get member's session to find current organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  // Find employee record for this member in the current organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const now = new Date();
  // Calculate today's boundaries (UTC-based for simplicity)
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  // Calculate current week boundaries (Monday to Sunday)
  const dayOfWeek = now.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  // 1. Hours Today
  const timelogsToday = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      employee_id: employee.id,
      date: {
        gte: todayStart,
        lt: todayEnd,
      },
      deleted_at: null,
    },
    _sum: { duration: true },
  });
  const hoursToday = (timelogsToday._sum.duration ?? 0) / 60;
  // 2. Hours This Week
  const timelogsThisWeek = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      employee_id: employee.id,
      date: {
        gte: weekStart,
        lt: weekEnd,
      },
      deleted_at: null,
    },
    _sum: { duration: true },
  });
  const hoursThisWeek = (timelogsThisWeek._sum.duration ?? 0) / 60;
  // 3. Active Timer
  const activeTimerRecord = await MyGlobal.prisma.erp_hrm_timers.findFirst({
    where: {
      erp_hrm_employee_id: employee.id,
      deleted_at: null,
    },
    ...ErpHrmTimerAtSummaryTransformer.select(),
  });
  const activeTimer = activeTimerRecord
    ? await ErpHrmTimerAtSummaryTransformer.transform(activeTimerRecord)
    : null;
  // 4. Recent Timelogs (5 most recent)
  const recentTimelogRecords = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: {
      employee_id: employee.id,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    take: 5,
    ...ErpHrmTimelogAtSummaryTransformer.select(),
  });
  const recentTimelogs = await ArrayUtil.asyncMap(
    recentTimelogRecords,
    ErpHrmTimelogAtSummaryTransformer.transform,
  );
  // 5. Pending Timesheet (draft or submitted for current week)
  const pendingTimesheetRecord =
    await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
      where: {
        employee_id: employee.id,
        week_start_date: {
          lte: now,
        },
        week_end_date: {
          gte: now,
        },
        status: { in: ["draft", "submitted"] },
        deleted_at: null,
      },
      ...ErpHrmTimesheetAtSummaryTransformer.select(),
    });
  const pendingTimesheet = pendingTimesheetRecord
    ? await ErpHrmTimesheetAtSummaryTransformer.transform(
        pendingTimesheetRecord,
      )
    : null;
  // 6. Assigned Tasks (open or in-progress)
  const assignedTaskRecords = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: {
      employee_id: employee.id,
      status: { in: ["open", "in-progress"] },
      deleted_at: null,
    },
    orderBy: [{ priority: "asc" }, { due_date: "asc" }],
    ...ErpHrmTaskAtSummaryTransformer.select(),
  });
  const assignedTasks = await ArrayUtil.asyncMap(
    assignedTaskRecords,
    ErpHrmTaskAtSummaryTransformer.transform,
  );
  return {
    hoursToday,
    hoursThisWeek,
    activeTimer,
    recentTimelogs,
    pendingTimesheet,
    assignedTasks,
  };
}
