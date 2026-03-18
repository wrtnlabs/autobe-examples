import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
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

export async function postErpHrmTimeTrackingMemberActivityLogEntrySnapshots(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate;
}): Promise<IErpHrmTimeTrackingActivityLogEntrySnapshot> {
  const nowIso = toISOStringSafe(new Date()) satisfies string &
    tags.Format<"date-time"> as string & tags.Format<"date-time">;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const activityLogEntry =
      await tx.erp_hrm_time_tracking_activity_log_entries.findUniqueOrThrow({
        where: { id: props.body.erpHrmTimeTrackingActivityLogEntryId },
        select: {
          id: true,
          organization_id: true,
          performed_by_member_id: true,
          action_type: true,
        },
      });
    if (
      activityLogEntry.organization_id !==
      props.body.erpHrmTimeTrackingOrganizationId
    ) {
      throw new HttpException("Activity log entry organization mismatch", 403);
    }
    if (activityLogEntry.performed_by_member_id !== props.body.performerId) {
      throw new HttpException(
        "PerformerId does not match the referenced activity log entry performer",
        403,
      );
    }
    if (activityLogEntry.action_type !== props.body.snapshotActionType) {
      throw new HttpException(
        "snapshotActionType must match the referenced activity log entry action_type",
        400,
      );
    }
    const created =
      await tx.erp_hrm_time_tracking_activity_log_entry_snapshots.create({
        data: {
          id: v4() satisfies string & tags.Format<"uuid"> as string &
            tags.Format<"uuid">,
          snapshot_action_type: props.body.snapshotActionType,
          snapshot_action_summary: props.body.snapshotActionSummary,
          performer_type: props.body.performerType,
          performer_id: props.body.performerId,
          target_entity_type: props.body.targetEntityType,
          target_entity_id: props.body.targetEntityId,
          target_additional_info: props.body.targetAdditionalInfo ?? null,
          created_at: nowIso,
          updated_at: nowIso,
          deleted_at: null,
          activityLogEntry: {
            connect: { id: props.body.erpHrmTimeTrackingActivityLogEntryId },
          },
          organization: {
            connect: { id: props.body.erpHrmTimeTrackingOrganizationId },
          },
        },
        select: {
          id: true,
          erp_hrm_time_tracking_activity_log_entry_id: true,
          erp_hrm_time_tracking_organization_id: true,
          snapshot_action_type: true,
          snapshot_action_summary: true,
          performer_type: true,
          performer_id: true,
          target_entity_type: true,
          target_entity_id: true,
          target_additional_info: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    return {
      id: created.id,
      erpHrmTimeTrackingActivityLogEntryId:
        created.erp_hrm_time_tracking_activity_log_entry_id,
      erpHrmTimeTrackingOrganizationId:
        created.erp_hrm_time_tracking_organization_id,
      snapshotActionType: created.snapshot_action_type,
      snapshotActionSummary: created.snapshot_action_summary,
      performerType: created.performer_type,
      performerId: created.performer_id,
      targetEntityType: created.target_entity_type,
      targetEntityId: created.target_entity_id,
      targetAdditionalInfo: created.target_additional_info,
      createdAt: toISOStringSafe(created.created_at),
      updatedAt: toISOStringSafe(created.updated_at),
      deletedAt:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  });
}
