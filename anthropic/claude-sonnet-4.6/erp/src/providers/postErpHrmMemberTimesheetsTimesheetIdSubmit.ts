import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
  // Step 1: Look up the timesheet (404 if not found)
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      organization_member_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
    },
  });
  // Step 2: Verify ownership — the org-member must belong to the authenticated member
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        id: timesheet.organization_member_id,
        member_id: props.member.id,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden: you do not own this timesheet", 403);
  }
  // Step 3: Active member check — deactivated members cannot submit
  if (orgMember.status === "deactivated") {
    throw new HttpException(
      "Forbidden: deactivated members cannot submit timesheets",
      403,
    );
  }
  // Step 4: Timesheet must be in 'draft' status
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Conflict: timesheet is not in draft status and cannot be submitted",
      409,
    );
  }
  // Step 5: Timesheet must contain at least one timelog
  const timelogCount = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: { timesheet_id: props.timesheetId },
  });
  if (timelogCount === 0) {
    throw new HttpException(
      "Bad Request: timesheet must contain at least one timelog before submission",
      400,
    );
  }
  // Step 6: Duplicate-week conflict check — no other submitted/approved timesheet for same week
  const duplicateWeek = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      organization_member_id: orgMember.id,
      week_start_date: timesheet.week_start_date,
      status: { in: ["submitted", "approved"] },
      id: { not: props.timesheetId },
    },
    select: { id: true },
  });
  if (duplicateWeek !== null) {
    throw new HttpException(
      "Conflict: another timesheet for the same week is already submitted or approved",
      409,
    );
  }
  // Step 7: All timelogs must have work_date within [week_start_date, week_end_date]
  const outOfRangeTimelog = await MyGlobal.prisma.erp_hrm_timelogs.findFirst({
    where: {
      timesheet_id: props.timesheetId,
      OR: [
        { work_date: { lt: timesheet.week_start_date } },
        { work_date: { gt: timesheet.week_end_date } },
      ],
    },
    select: { id: true },
  });
  if (outOfRangeTimelog !== null) {
    throw new HttpException(
      "Bad Request: one or more timelogs have work dates outside the timesheet week range",
      400,
    );
  }
  // Step 8: Transition status to 'submitted'
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "submitted",
      submitted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Step 9: Re-fetch updated timesheet and return full DTO
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return ErpHrmTimesheetTransformer.transform(updated);
}
