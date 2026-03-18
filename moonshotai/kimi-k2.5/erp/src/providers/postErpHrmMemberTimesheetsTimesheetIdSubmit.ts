import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
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
  timesheetId: string;
}): Promise<IErpHrmTimesheet> {
  // Fetch the timesheet with its organization member to verify ownership
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      organization_member_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organizationMember: {
        select: {
          id: true,
          user_id: true,
        },
      },
    },
  });
  // Verify timesheet belongs to the authenticated member via user_id match
  if (timesheet.organizationMember.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate status is draft
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Timesheet can only be submitted from draft status",
      400,
    );
  }
  // Check at least one timelog exists for this timesheet
  const timelogCount = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: { timesheet_id: props.timesheetId },
  });
  if (timelogCount === 0) {
    throw new HttpException("Timesheet must contain at least one timelog", 400);
  }
  // Check for existing submitted or approved timesheet for same employee and week
  const existingTimesheet = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      organization_member_id: timesheet.organization_member_id,
      week_start_date: timesheet.week_start_date,
      week_end_date: timesheet.week_end_date,
      status: { in: ["submitted", "approved"] },
      id: { not: props.timesheetId },
      deleted_at: null,
    },
  });
  if (existingTimesheet !== null) {
    throw new HttpException(
      "A timesheet for this week is already submitted or approved",
      409,
    );
  }
  // Update timesheet status to submitted with current timestamp
  const now = new Date();
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    },
  });
  // Fetch updated timesheet with full relations using transformer select
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  return await ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
