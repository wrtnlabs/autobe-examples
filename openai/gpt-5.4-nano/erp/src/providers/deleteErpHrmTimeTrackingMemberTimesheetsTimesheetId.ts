import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteErpHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const timesheet =
      await prisma.erp_hrm_time_tracking_timesheets.findUniqueOrThrow({
        where: { id: props.timesheetId },
        select: {
          id: true,
          erp_hrm_time_tracking_organization_id: true,
          erp_hrm_time_tracking_employee_id: true,
          status: true,
        },
      });
    // Organization scoping / ownership enforcement (member is the employee identity in this model).
    if (timesheet.erp_hrm_time_tracking_employee_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    // Workflow eligibility: approved timesheets are locked for deletion.
    if (timesheet.status === "approved") {
      throw new HttpException("Approved timesheets cannot be deleted", 403);
    }
    // Ensure no active versioning lock blocks deletion (locks may be active even when status allows).
    const activeLocks =
      await prisma.erp_hrm_time_tracking_timesheet_versioning_locks.findMany({
        where: { timesheet_id: timesheet.id, deleted_at: null },
        select: { locked_by_user_id: true },
      });
    // If there are active locks, only the lock owner can delete.
    // (Fallback: if locked_by_user_id exists but member isn't owner, reject.)
    if (activeLocks.some((l) => l.locked_by_user_id !== props.member.id)) {
      throw new HttpException("Timesheet is locked", 409);
    }
    await prisma.erp_hrm_time_tracking_timesheet_versioning_locks.deleteMany({
      where: { timesheet_id: timesheet.id, deleted_at: null },
    });
    await prisma.erp_hrm_time_tracking_timesheets.delete({
      where: { id: timesheet.id },
    });
  });
}
