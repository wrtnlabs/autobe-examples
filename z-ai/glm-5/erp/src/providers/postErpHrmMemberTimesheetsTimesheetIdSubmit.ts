import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimesheet> {
  // Query the timesheet with employee relation
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
      employee_id: true,
      week_start_date: true,
      status: true,
      employee: {
        select: {
          id: true,
          erp_hrm_member_id: true,
          erp_hrm_organization_id: true,
          status: true,
        },
      },
    },
  });
  // Verify the timesheet belongs to the authenticated member
  if (timesheet.employee.erp_hrm_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify employee is active
  if (timesheet.employee.status !== "active") {
    throw new HttpException(
      "Deactivated employees cannot submit timesheets",
      403,
    );
  }
  // Verify timesheet is in draft status
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 400);
  }
  // Check for at least one timelog
  const timelogCount = await MyGlobal.prisma.erp_hrm_timesheet_timelogs.count({
    where: {
      timesheet_id: props.timesheetId,
    },
  });
  if (timelogCount === 0) {
    throw new HttpException("Timesheet must contain at least one timelog", 400);
  }
  // Check for duplicate submission for the same week
  const existingSubmission = await MyGlobal.prisma.erp_hrm_timesheets.findFirst(
    {
      where: {
        employee_id: timesheet.employee_id,
        week_start_date: timesheet.week_start_date,
        id: { not: props.timesheetId },
        status: { in: ["submitted", "approved"] },
        deleted_at: null,
      },
    },
  );
  if (existingSubmission !== null) {
    throw new HttpException(
      "Another timesheet for this week is already submitted or approved",
      400,
    );
  }
  // Update the timesheet to submitted status
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "submitted",
      submitted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated timesheet using transformer
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return await ErpHrmTimesheetTransformer.transform(updated);
}
