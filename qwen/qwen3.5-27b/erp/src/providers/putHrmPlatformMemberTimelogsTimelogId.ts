import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimelog.IUpdate;
}): Promise<IHrmPlatformTimelog> {
  // 1. Retrieve the timelog
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_project_id: true,
        hrm_platform_task_id: true,
        date: true,
        duration: true,
        billable: true,
        description: true,
        deleted_at: true,
      },
    },
  );
  // 2. Check if timelog is soft-deleted
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  // 3. Authorization check - verify member owns this timelog
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null || employee.id !== timelog.hrm_platform_employee_id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Check timesheet status - find if timelog is in an approved timesheet
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
    where: {
      hrm_platform_employee_id: timelog.hrm_platform_employee_id,
      status: "approved",
      deleted_at: null,
    },
    select: { week_start_date: true },
  });
  if (timesheet) {
    const weekStart = timesheet.week_start_date;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const timelogDate = timelog.date;
    if (timelogDate >= weekStart && timelogDate < weekEnd) {
      throw new HttpException("Cannot edit timelog in approved timesheet", 409);
    }
  }
  // 5. Build update data
  const updateData: Prisma.hrm_platform_timelogsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.duration !== undefined) {
    updateData.duration = props.body.duration;
  }
  if (props.body.hrm_platform_project_id !== undefined) {
    // Verify project exists
    await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
      where: { id: props.body.hrm_platform_project_id },
      select: { id: true },
    });
    updateData.project = {
      connect: { id: props.body.hrm_platform_project_id },
    };
  }
  if (props.body.hrm_platform_task_id !== undefined) {
    if (props.body.hrm_platform_task_id !== null) {
      // Verify task exists and belongs to same project
      const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
        where: { id: props.body.hrm_platform_task_id },
        select: { id: true, hrm_platform_project_id: true },
      });
      const targetProjectId =
        props.body.hrm_platform_project_id ?? timelog.hrm_platform_project_id;
      if (task.hrm_platform_project_id !== targetProjectId) {
        throw new HttpException("Task must belong to the same project", 400);
      }
      updateData.task = { connect: { id: props.body.hrm_platform_task_id } };
    } else {
      updateData.task = { disconnect: true };
    }
  }
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // 6. Update the timelog
  const updated = await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
    ...HrmPlatformTimelogTransformer.select(),
  });
  return await HrmPlatformTimelogTransformer.transform(updated);
}
