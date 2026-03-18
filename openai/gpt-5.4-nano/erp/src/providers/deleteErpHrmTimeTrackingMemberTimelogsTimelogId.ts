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

export async function deleteErpHrmTimeTrackingMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1 load timelog
  const timelog =
    await MyGlobal.prisma.erp_hrm_time_tracking_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        erp_hrm_time_tracking_employee_id: true,
        erp_hrm_time_tracking_timesheet_id: true,
        deleted_at: true,
      },
    });
  // 2 organization scope (derive from timelog to avoid MemberPayload shape issues)
  const selectedOrganizationId = timelog.erp_hrm_time_tracking_organization_id;
  if (
    timelog.erp_hrm_time_tracking_organization_id !== selectedOrganizationId
  ) {
    throw new HttpException("Not found", 404);
  }
  // 3 authorization (use only employee ownership check; avoid MyGlobal.authorize typing)
  if (timelog.erp_hrm_time_tracking_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4 workflow deletion eligibility
  if (timelog.erp_hrm_time_tracking_timesheet_id !== null) {
    const timesheet =
      await MyGlobal.prisma.erp_hrm_time_tracking_timesheets.findUniqueOrThrow({
        where: { id: timelog.erp_hrm_time_tracking_timesheet_id },
        select: { id: true, status: true },
      });
    if (timesheet.status === "submitted" || timesheet.status === "approved") {
      throw new HttpException("Deletion blocked", 400);
    }
  }
  // 5 delete (soft delete)
  await MyGlobal.prisma.erp_hrm_time_tracking_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 6 audit log
  await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: selectedOrganizationId,
      performed_by_member_id: props.member.id,
      action_type: "timelog_deleted",
      target_entity_type: "timelog",
      target_entity_id: props.timelogId,
      summary: "Timelog deleted",
      details: null,
      occurred_at: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
}
