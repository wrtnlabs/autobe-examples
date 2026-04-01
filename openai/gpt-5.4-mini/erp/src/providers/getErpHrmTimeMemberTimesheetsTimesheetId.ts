import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTimesheet> {
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        erp_hrm_time_employee_id: true,
        reviewed_by_member_id: true,
        week_start_date: true,
        week_end_date: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
      },
    });
  if (
    timesheet.erp_hrm_time_employee_id !== props.member.id &&
    timesheet.status !== "submitted" &&
    timesheet.status !== "approved" &&
    timesheet.status !== "rejected"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: timesheet.id,
    status: timesheet.status,
    created_at: toISOStringSafe(timesheet.created_at),
    updated_at: toISOStringSafe(timesheet.updated_at),
    deleted_at:
      timesheet.deleted_at === null
        ? null
        : toISOStringSafe(timesheet.deleted_at),
    week_start_date: toISOStringSafe(timesheet.week_start_date),
    week_end_date: toISOStringSafe(timesheet.week_end_date),
    submitted_at:
      timesheet.submitted_at === null
        ? null
        : toISOStringSafe(timesheet.submitted_at),
    reviewed_at:
      timesheet.reviewed_at === null
        ? null
        : toISOStringSafe(timesheet.reviewed_at),
    rejection_reason: timesheet.rejection_reason,
  } as unknown as IErpHrmTimeTimesheet;
}
