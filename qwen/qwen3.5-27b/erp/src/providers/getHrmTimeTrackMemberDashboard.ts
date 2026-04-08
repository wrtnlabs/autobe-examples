import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackPersonalDashboard";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "../transformers/HrmTimeTrackEmployeeAtSummaryTransformer";
import { HrmTimeTrackProjectMemberAtSummaryTransformer } from "../transformers/HrmTimeTrackProjectMemberAtSummaryTransformer";
import { HrmTimeTrackTaskAtSummaryTransformer } from "../transformers/HrmTimeTrackTaskAtSummaryTransformer";
import { HrmTimeTrackTimelogAtSummaryTransformer } from "../transformers/HrmTimeTrackTimelogAtSummaryTransformer";
import { HrmTimeTrackTimesheetAtSummaryTransformer } from "../transformers/HrmTimeTrackTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IHrmTimeTrackPersonalDashboard> {
  // Get the employee record for the authenticated member
  const employee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirstOrThrow({
      where: {
        hrm_time_track_member_id: props.member.id,
        deleted_at: null,
      },
      ...HrmTimeTrackEmployeeAtSummaryTransformer.select(),
    });
  // Calculate current week boundaries (Monday-Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const weekStart = monday;
  const weekEnd = sunday;
  // Get active tasks assigned to the employee
  const activeTasks = await MyGlobal.prisma.hrm_time_track_tasks.findMany({
    where: {
      hrm_time_track_employee_id: employee.id,
      status: { in: ["open", "in-progress"] },
      deleted_at: null,
    },
    orderBy: [{ priority: "desc" }, { created_at: "asc" }],
    ...HrmTimeTrackTaskAtSummaryTransformer.select(),
  });
  // Get recent timelogs for current week
  const recentTimelogs = await MyGlobal.prisma.hrm_time_track_timelogs.findMany(
    {
      where: {
        hrm_time_track_employee_id: employee.id,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        deleted_at: null,
      },
      orderBy: { date: "desc" },
      ...HrmTimeTrackTimelogAtSummaryTransformer.select(),
    },
  );
  // Get current week's timesheet
  const currentTimesheet =
    await MyGlobal.prisma.hrm_time_track_timesheets.findFirst({
      where: {
        hrm_time_track_employee_id: employee.id,
        week_start_date: weekStart,
        deleted_at: null,
      },
      ...HrmTimeTrackTimesheetAtSummaryTransformer.select(),
    });
  // Get project memberships for the employee
  const projectMemberships =
    await MyGlobal.prisma.hrm_time_track_project_members.findMany({
      where: {
        hrm_time_track_employee_id: employee.id,
        deleted_at: null,
        project: {
          status: "active",
        },
      },
      ...HrmTimeTrackProjectMemberAtSummaryTransformer.select(),
    });
  // Calculate statistics
  const totalActiveTasks = activeTasks.length;
  const hoursLoggedThisWeek =
    recentTimelogs.reduce((sum, log) => sum + log.duration_seconds, 0) / 3600;
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_time_track_timesheets.count({
      where: {
        hrm_time_track_employee_id: employee.id,
        status: "submitted",
        deleted_at: null,
      },
    });
  // Transform all data
  const transformedEmployee =
    await HrmTimeTrackEmployeeAtSummaryTransformer.transform(employee);
  const transformedActiveTasks =
    await HrmTimeTrackTaskAtSummaryTransformer.transformAll(activeTasks);
  const transformedRecentTimelogs = await ArrayUtil.asyncMap(
    recentTimelogs,
    (r) => HrmTimeTrackTimelogAtSummaryTransformer.transform(r),
  );
  const transformedProjectMemberships = await ArrayUtil.asyncMap(
    projectMemberships,
    (r) => HrmTimeTrackProjectMemberAtSummaryTransformer.transform(r),
  );
  const transformedCurrentTimesheet = currentTimesheet
    ? await HrmTimeTrackTimesheetAtSummaryTransformer.transform(
        currentTimesheet,
      )
    : null;
  return {
    activeTasks: transformedActiveTasks,
    currentTimesheet: transformedCurrentTimesheet,
    employee: transformedEmployee,
    projectMemberships: transformedProjectMemberships,
    recentTimelogs: transformedRecentTimelogs,
    statistics: {
      hoursLoggedThisWeek,
      pendingTimesheets,
      totalActiveTasks,
    },
  };
}
