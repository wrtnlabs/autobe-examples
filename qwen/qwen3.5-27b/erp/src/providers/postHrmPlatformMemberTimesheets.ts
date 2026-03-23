import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
  // Get authenticated member's employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  // Parse and validate week_start_date
  const weekStartDate = new Date(props.body.week_start_date);
  // Validate it's a Monday (day 1 in JavaScript)
  if (weekStartDate.getDay() !== 1) {
    throw new HttpException("week_start_date must be a Monday", 400);
  }
  // Validate it's not in the future
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (weekStartDate > now) {
    throw new HttpException("Cannot create timesheet for future weeks", 400);
  }
  // Check for existing submitted/approved timesheets for same week
  const existingTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        week_start_date: weekStartDate,
        status: { in: ["submitted", "approved"] },
        deleted_at: null,
      },
    });
  if (existingTimesheet !== null) {
    throw new HttpException(
      "A timesheet for this week already exists in submitted or approved status",
      409,
    );
  }
  // Use collector to create timesheet data
  const timesheetData = await HrmPlatformTimesheetCollector.collect({
    body: props.body,
    hrmPlatformEmployees: employee,
  });
  // Create the timesheet with transformer select
  const created = await MyGlobal.prisma.hrm_platform_timesheets.create({
    data: timesheetData,
    ...HrmPlatformTimesheetTransformer.select(),
  });
  // Transform and return
  return await HrmPlatformTimesheetTransformer.transform(created);
}
