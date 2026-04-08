import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
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
import { HrmTimeTrackTimesheetCollector } from "../collectors/HrmTimeTrackTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimesheetTransformer } from "../transformers/HrmTimeTrackTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmTimeTrackTimesheet.ICreate;
}): Promise<IHrmTimeTrackTimesheet> {
  // Find the employee record for the authenticated member
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Validate employee exists
  if (employee === null) {
    throw new HttpException("You are not an employee in any organization", 403);
  }
  // Validate employee is active (not deactivated)
  if (employee.status === "deactivated") {
    throw new HttpException(
      "Deactivated employees cannot create timesheets",
      403,
    );
  }
  // Check for existing timesheet for this employee and week
  const weekStart = new Date(props.body.week_start_date);
  const existingTimesheet =
    await MyGlobal.prisma.hrm_time_track_timesheets.findFirst({
      where: {
        hrm_time_track_employee_id: employee.id,
        week_start_date: weekStart,
        deleted_at: null,
      },
    });
  // If timesheet already exists, return 409 Conflict
  if (existingTimesheet !== null) {
    throw new HttpException("A timesheet already exists for this week", 409);
  }
  // Create the timesheet using collector and transformer
  const record = await MyGlobal.prisma.hrm_time_track_timesheets.create({
    data: await HrmTimeTrackTimesheetCollector.collect({
      body: props.body,
      hrmTimeTrackEmployees: {
        id: employee.id,
      } satisfies IEntity,
    }),
    ...HrmTimeTrackTimesheetTransformer.select(),
  });
  // Transform and return the created timesheet
  return await HrmTimeTrackTimesheetTransformer.transform(record);
}
