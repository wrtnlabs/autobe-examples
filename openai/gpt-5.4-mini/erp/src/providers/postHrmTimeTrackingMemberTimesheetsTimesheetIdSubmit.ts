import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        organization_id: true,
        employee_id: true,
        status: true,
        week_start: true,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: timesheet.employee_id },
      select: {
        user_account_id: true,
      },
    });
  if (employee.user_account_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet must be draft", 422);
  }
  const timelogCount =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_timelogs.count({
      where: {
        timesheet: {
          id: timesheet.id,
        },
      },
    });
  if (timelogCount === 0) {
    throw new HttpException("Timesheet must contain at least one timelog", 422);
  }
  const conflicting =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        organization_id: timesheet.organization_id,
        employee_id: timesheet.employee_id,
        week_start: timesheet.week_start,
        status: { in: ["submitted", "approved"] },
        id: { not: timesheet.id },
      },
      select: { id: true },
    });
  if (conflicting !== null) {
    throw new HttpException(
      "Another submitted or approved timesheet already exists for this week",
      409,
    );
  }
  await MyGlobal.prisma.hrm_time_tracking_timesheets.update({
    where: { id: timesheet.id },
    data: {
      status: "submitted",
      submitted_at: new Date(),
      reviewed_at: null,
      reviewed_by_employee_id: null,
      rejection_reason: null,
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: timesheet.id },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  return HrmTimeTrackingTimesheetTransformer.transform(updated);
}
