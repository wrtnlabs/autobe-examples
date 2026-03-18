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
import { HrmPlatformTimesheetCollector } from "../collectors/HrmPlatformTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmPlatformTimesheet.ICreate;
}): Promise<IHrmPlatformTimesheet> {
  // Step 1: Get employee record for authenticated member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found in organization", 404);
  }
  // Step 2: Validate week_start_date is a Monday
  const weekStartDate = new Date(props.body.week_start_date);
  const dayOfWeek = weekStartDate.getUTCDay();
  if (dayOfWeek !== 1) {
    throw new HttpException("week_start_date must be a Monday", 400);
  }
  // Step 3: Calculate week_end_date (Sunday = Monday + 6 days)
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);
  // Step 4: Check for existing timesheets with overlapping period
  const existingTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
        status: { in: ["submitted", "approved"] },
        OR: [
          {
            week_start_date: { lte: weekEndDate },
            week_end_date: { gte: weekStartDate },
          },
        ],
      },
    });
  if (existingTimesheet) {
    throw new HttpException("Timesheet already exists for this week", 400);
  }
  // Step 5: Query timelogs for this employee within the week period
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      hrm_platform_employee_id: employee.id,
      date: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
      deleted_at: null,
    },
  });
  // Step 6: Create timesheet using collector
  const timesheetData = await HrmPlatformTimesheetCollector.collect({
    body: props.body,
    hrmPlatformEmployees: employee,
  });
  // Step 7: Create timesheet record with timelogs linked via junction table
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      status: "draft",
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: employee.id } },
      reviewer: undefined,
      timesheetTimelogs: {
        create: timelogs.map((timelog) => ({
          id: v4() as string & tags.Format<"uuid">,
          created_at: new Date(),
          updated_at: new Date(),
          timelog: { connect: { id: timelog.id } },
        })),
      },
    },
    ...HrmPlatformTimesheetTransformer.select(),
  });
  // Step 8: Transform and return
  return await HrmPlatformTimesheetTransformer.transform(timesheet);
}
