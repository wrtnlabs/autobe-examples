import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
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

export async function putErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId(props: {
  member: MemberPayload;
  activityLogEntryId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingActivityLogEntry.IUpdate;
}): Promise<IErpHrmTimeTrackingActivityLogEntry> {
  const memberId = props.member.id;
  const tx = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing =
      await prisma.erp_hrm_time_tracking_activity_log_entries.findUniqueOrThrow(
        {
          where: { id: props.activityLogEntryId },
          select: {
            id: true,
            organization_id: true,
            performed_by_member_id: true,
            action_type: true,
            target_entity_type: true,
            target_entity_id: true,
            summary: true,
            details: true,
            occurred_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      );
    // Authorization: restrict updates to the original performer.
    // (Organization scoping/role-based checks occur in higher layers.)
    if (existing.performed_by_member_id !== memberId) {
      throw new HttpException("Forbidden", 403);
    }
    await prisma.erp_hrm_time_tracking_activity_log_entries.update({
      where: { id: props.activityLogEntryId },
      data: {
        action_type: props.body.action_type,
        target_entity_type: props.body.target_entity_type,
        target_entity_id: props.body.target_entity_id,
        summary: props.body.summary,
        details: props.body.details,
        occurred_at: props.body.occurred_at,
      },
    });
    const updated =
      await prisma.erp_hrm_time_tracking_activity_log_entries.findUniqueOrThrow(
        {
          where: { id: props.activityLogEntryId },
          select: {
            id: true,
            organization_id: true,
            performed_by_member_id: true,
            action_type: true,
            target_entity_type: true,
            target_entity_id: true,
            summary: true,
            details: true,
            occurred_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      );
    return {
      id: updated.id,
      organization_id: updated.organization_id,
      performed_by_member_id: updated.performed_by_member_id,
      action_type: updated.action_type,
      target_entity_type: updated.target_entity_type,
      target_entity_id: updated.target_entity_id,
      summary: updated.summary,
      details: updated.details,
      occurred_at: toISOStringSafe(updated.occurred_at),
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
    } satisfies IErpHrmTimeTrackingActivityLogEntry;
  });
  return tx;
}
