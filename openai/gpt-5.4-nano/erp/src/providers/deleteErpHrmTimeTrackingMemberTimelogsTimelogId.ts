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
  const timelog =
    await MyGlobal.prisma.erp_hrm_time_tracking_timelogs.findFirstOrThrow({
      where: { id: props.timelogId, deleted_at: null },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        erp_hrm_time_tracking_employee_id: true,
        erp_hrm_time_tracking_timesheet_id: true,
      },
    });
  const isOwner = timelog.erp_hrm_time_tracking_employee_id === props.member.id;
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  if (timelog.erp_hrm_time_tracking_timesheet_id !== null) {
    const ts =
      await MyGlobal.prisma.erp_hrm_time_tracking_timesheets.findUniqueOrThrow({
        where: { id: timelog.erp_hrm_time_tracking_timesheet_id },
        select: { id: true, status: true, deleted_at: true },
      });
    if (
      ts.deleted_at === null &&
      (ts.status === "submitted" || ts.status === "approved")
    ) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_timelogs.delete({
    where: { id: props.timelogId },
  });
  const now = new Date();
  await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.create({
    data: {
      id: v4() as any,
      organization_id: timelog.erp_hrm_time_tracking_organization_id,
      performed_by_member_id: props.member.id,
      action_type: "timelog_deleted",
      target_entity_type: "timelog",
      target_entity_id: props.timelogId,
      summary: "Timelog deleted",
      details: null,
      occurred_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
