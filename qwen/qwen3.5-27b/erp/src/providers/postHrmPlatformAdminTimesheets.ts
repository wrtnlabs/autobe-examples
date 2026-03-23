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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAdminTimesheets(props: {
  admin: AdminPayload;
  body: IHrmPlatformTimesheet.ICreate;
}): Promise<IHrmPlatformTimesheet> {
  const memberSession =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUnique({
      where: {
        id: props.admin.session_id,
      },
      select: {
        hrm_platform_member_id: true,
        hrm_platform_organization_id: true,
      },
    });
  if (memberSession === null) {
    throw new HttpException("No member session found for this admin", 403);
  }
  if (memberSession.hrm_platform_organization_id === null) {
    throw new HttpException(
      "No organization context found for this admin",
      403,
    );
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: memberSession.hrm_platform_member_id,
      organization_id: memberSession.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("No employee record found for this admin", 403);
  }
  const weekStartDate = new Date(props.body.week_start_date);
  if (weekStartDate.getDay() !== 1) {
    throw new HttpException("week_start_date must be a Monday", 400);
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (weekStartDate > now) {
    throw new HttpException("week_start_date cannot be in the future", 400);
  }
  const existingTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        week_start_date: weekStartDate,
        status: {
          in: ["submitted", "approved"],
        },
        deleted_at: null,
      },
    });
  if (existingTimesheet !== null) {
    throw new HttpException(
      "A timesheet for this week already exists in submitted or approved status",
      400,
    );
  }
  const timesheetData = await HrmPlatformTimesheetCollector.collect({
    body: props.body,
    hrmPlatformEmployees: {
      id: employee.id,
    },
  });
  const created = await MyGlobal.prisma.hrm_platform_timesheets.create({
    data: timesheetData,
    ...HrmPlatformTimesheetTransformer.select(),
  });
  return await HrmPlatformTimesheetTransformer.transform(created);
}
