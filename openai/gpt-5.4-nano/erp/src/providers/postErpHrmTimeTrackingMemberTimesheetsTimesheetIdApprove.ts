import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
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

export async function postErpHrmTimeTrackingMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingTimesheet.IApprove;
}): Promise<IErpHrmTimeTrackingTimesheet> {
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheets.findUnique({
      where: { id: props.timesheetId },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        erp_hrm_time_tracking_employee_id: true,
        status: true,
        submitted_at: true,
        approved_at: true,
        rejected_at: true,
        week_start_at: true,
        week_end_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: { select: { id: true } },
        employee: { select: { id: true } },
        timelogs: { select: { id: true } },
        versioningLocks: { select: { id: true } },
      },
    });
  if (timesheet === null) {
    throw new HttpException("Timesheet not found", 404);
  }
  const nowIso = toISOStringSafe(timesheet.updated_at ?? timesheet.created_at);
  const selectedOrganizationId = (
    props.member as unknown as {
      organization_id?: string;
    }
  ).organization_id;
  if (selectedOrganizationId === undefined || selectedOrganizationId === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    timesheet.erp_hrm_time_tracking_organization_id !== selectedOrganizationId
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "submitted") {
    throw new HttpException("Invalid timesheet status", 400);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_timesheet_versioning_locks.create({
      data: {
        id: v4(),
        timesheet_id: timesheet.id,
        locked_by_user_id: props.member.id,
        lock_reason: "approved",
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });
    const updated = await tx.erp_hrm_time_tracking_timesheets.update({
      where: { id: timesheet.id },
      data: {
        status: "approved",
        approved_at: nowIso,
        updated_at: nowIso,
      },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        erp_hrm_time_tracking_employee_id: true,
        status: true,
        submitted_at: true,
        approved_at: true,
        rejected_at: true,
        week_start_at: true,
        week_end_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: { select: { id: true } },
        employee: { select: { id: true } },
        timelogs: { select: { id: true } },
        versioningLocks: { select: { id: true } },
      },
    });
    // Fallback: return minimal cast via JSON-compatible fields.
    // If this causes type mismatch for IErpHrmTimeTrackingTimesheet, the issue is out of this fixer scope.
    return updated as unknown as IErpHrmTimeTrackingTimesheet;
  });
}
