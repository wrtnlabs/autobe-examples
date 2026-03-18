import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformTimelogCollector } from "../collectors/HrmPlatformTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.ICreate;
}): Promise<IHrmPlatformTimelog> {
  // Step 1: Get employee record for authenticated member
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        status: true,
      },
    });
  // Step 2: Validate employee is active
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  // Step 3: Validate project exists and employee is assigned to it
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirstOrThrow({
      where: {
        employee: { id: employee.id },
        project: { id: props.body.project_id },
        deleted_at: null,
      },
      select: {
        project: { select: { id: true } },
      },
    });
  // Step 4: Validate project status is active
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.body.project_id },
      select: {
        id: true,
        status: true,
      },
    },
  );
  if (project.status !== "active") {
    throw new HttpException(
      "Cannot create timelog for archived or completed project",
      400,
    );
  }
  // Step 5: Validate task if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: {
        id: true,
        hrm_platform_project_id: true,
      },
    });
    if (task.hrm_platform_project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // Step 6: Validate date is not in the future
  const workDate = new Date(props.body.date);
  const now = new Date();
  if (workDate > now) {
    throw new HttpException("Timelog date cannot be in the future", 400);
  }
  // Step 7: Check for approved timesheet conflict
  // Calculate week boundaries (Monday to Sunday)
  const weekStart = getWeekStartDate(workDate);
  const weekEnd = getWeekEndDate(weekStart);
  const approvedTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee_id: employee.id,
        status: "approved",
        week_start_date: weekStart,
        week_end_date: weekEnd,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (approvedTimesheet) {
    throw new HttpException(
      "Cannot create timelog for date in approved timesheet week",
      400,
    );
  }
  // Step 8: Create timelog using collector
  const created = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: await HrmPlatformTimelogCollector.collect({
      body: props.body,
      hrmPlatformEmployees: { id: employee.id },
      hrmPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...HrmPlatformTimelogTransformer.select(),
  });
  // Step 9: Transform and return
  return await HrmPlatformTimelogTransformer.transform(created);
}
// Helper functions for week boundary calculation
function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getWeekEndDate(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}
