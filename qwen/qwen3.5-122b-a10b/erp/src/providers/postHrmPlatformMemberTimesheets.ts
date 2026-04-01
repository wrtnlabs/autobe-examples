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
  // Step 1: Find employee record for authenticated member in current organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found in organization", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee account is not active", 400);
  }
  // Step 2: Validate week_start_date is a Monday
  const startDate = new Date(props.body.week_start_date);
  if (startDate.getUTCDay() !== 1) {
    throw new HttpException("week_start_date must be a Monday", 400);
  }
  // Step 3: Calculate week_end_date (Sunday) from week_start_date (Monday)
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);
  // Step 4: Query all timelogs for this employee within the week period
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      hrm_platform_employee_id: employee.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
      deleted_at: null,
    },
    orderBy: { date: "asc" },
  });
  // Step 5: Create timesheet using collector
  const timesheetData = await HrmPlatformTimesheetCollector.collect({
    body: props.body,
    hrPlatformEmployees: { id: employee.id },
  });
  // Step 6: Create timesheet record with reviewer relation
  let created;
  try {
    created = await MyGlobal.prisma.hrm_platform_timesheets.create({
      data: {
        ...timesheetData,
        reviewer: { connect: { id: props.member.id } },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "A timesheet already exists for this employee and week period",
        400,
      );
    }
    throw error;
  }
  // Step 7: Link timelogs through junction table
  if (timelogs.length > 0) {
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.createMany({
      data: timelogs.map((timelog) => ({
        id: v4(),
        hrm_platform_timesheet_id: created.id,
        hrm_platform_timelog_id: timelog.id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      })),
    });
  }
  // Step 8: Refresh timesheet with transformer select and transform
  const refreshed =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: created.id },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(refreshed);
}
