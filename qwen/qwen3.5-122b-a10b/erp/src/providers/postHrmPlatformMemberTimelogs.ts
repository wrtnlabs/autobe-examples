import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
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
  // Step 1: Get employee record for the authenticated member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Step 2: Verify project exists
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.body.project_id },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Step 3: If task_id provided, verify task exists and belongs to project
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: { id: props.body.task_id },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.hrm_platform_projects_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
    if (task.deleted_at !== null) {
      throw new HttpException("Task has been deleted", 400);
    }
  }
  // Step 4: Verify date is not in the future
  const inputDate = new Date(props.body.date);
  const now = new Date();
  if (inputDate > now) {
    throw new HttpException("Date cannot be in the future", 400);
  }
  // Step 5: Check if employee has an approved timesheet for this date
  // First, find timelogs for this date
  const timelogsForDate = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      hrm_platform_employee_id: employee.id,
      date: inputDate,
    },
    select: {
      id: true,
    },
  });
  // Then check if any of those timelogs are in approved timesheets
  if (timelogsForDate.length > 0) {
    const timesheetTimelogs =
      await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
        where: {
          hrm_platform_timelog_id: {
            in: timelogsForDate.map((t) => t.id),
          },
          timesheet: {
            hrm_platform_employee_id: employee.id,
            status: "approved",
          },
        },
        select: {
          id: true,
        },
      });
    if (timesheetTimelogs.length > 0) {
      throw new HttpException(
        "Cannot create timelog for date in an approved timesheet",
        409,
      );
    }
  }
  // Step 6: Create timelog using collector
  const timelogData = await HrmPlatformTimelogCollector.collect({
    body: props.body,
    hrmPlatformEmployees: {
      id: employee.id,
    },
  });
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: timelogData,
    ...HrmPlatformTimelogTransformer.select(),
  });
  // Step 7: Transform and return
  return await HrmPlatformTimelogTransformer.transform(timelog);
}
