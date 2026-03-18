import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheet> {
  // Find employee record for authenticated member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // Validate employee is active
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  // Retrieve timesheet with timelogs
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
    where: {
      id: props.timesheetId,
    },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
      timesheetTimelogs: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Validate ownership
  if (timesheet.hrm_platform_employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate draft status
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 400);
  }
  // Validate timelog presence
  if (timesheet.timesheetTimelogs.length === 0) {
    throw new HttpException("Timesheet has no timelogs", 400);
  }
  // Check weekly conflict
  const conflictingTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        week_start_date: timesheet.week_start_date,
        status: {
          in: ["submitted", "approved"],
        },
        id: {
          not: props.timesheetId,
        },
        deleted_at: null,
      },
    });
  if (conflictingTimesheet) {
    throw new HttpException(
      "A timesheet for this week already exists in submitted or approved status",
      409,
    );
  }
  // Update timesheet in transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_platform_timesheets.update({
      where: {
        id: props.timesheetId,
      },
      data: {
        status: "submitted",
        submitted_at: now,
        reviewed_at: null,
        rejection_reason: null,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.hrm_platform_activity_logs.create({
      data: {
        id: v4(),
        organization_id: employee.hrm_platform_organization_id,
        user_id: props.member.id,
        action_type: "timesheet:submit",
        target_entity: "timesheet",
        target_id: props.timesheetId,
        details: JSON.stringify({
          week_start_date: toISOStringSafe(timesheet.week_start_date),
          week_end_date: toISOStringSafe(timesheet.week_end_date),
          submitted_at: toISOStringSafe(now),
        }),
        created_at: now,
      },
    }),
  ]);
  // Re-fetch timesheet with proper select for transformation
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
