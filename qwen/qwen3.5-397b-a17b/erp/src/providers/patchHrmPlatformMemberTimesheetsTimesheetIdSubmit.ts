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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheet> {
  // Retrieve timesheet with employee relation
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        employee_id: true,
        status: true,
        week_start_date: true,
        employee: {
          select: {
            id: true,
            member_id: true,
            status: true,
          },
        },
      },
    });
  // Validate ownership - member must own the employee record
  if (timesheet.employee.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate employee is active
  if (timesheet.employee.status !== "active") {
    throw new HttpException(
      "Deactivated employees cannot submit timesheets",
      400,
    );
  }
  // Validate timesheet is in draft status
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 400);
  }
  // Count timelogs - reject if empty
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      timesheet_id: props.timesheetId,
    },
  });
  if (timelogCount === 0) {
    throw new HttpException("Timesheet contains no timelogs", 400);
  }
  // Check for duplicate submitted/approved timesheets for same employee and week
  const duplicate = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
    where: {
      employee_id: timesheet.employee_id,
      week_start_date: timesheet.week_start_date,
      id: { not: props.timesheetId },
      status: { in: ["submitted", "approved"] },
      deleted_at: null,
    },
  });
  if (duplicate) {
    throw new HttpException("Duplicate timesheet exists for same week", 409);
  }
  // Update timesheet status to submitted
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "submitted",
      submitted_at: new Date(),
    },
  });
  // Return updated timesheet with full details
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
