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

export async function getErpHrmTimeTrackingMemberActivityLogEntrySnapshotsActivityLogEntrySnapshotId(props: {
  member: MemberPayload;
  activityLogEntrySnapshotId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingActivityLogEntrySnapshot> {
  const snapshot =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.findUniqueOrThrow(
      {
        where: { id: props.activityLogEntrySnapshotId },
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
      },
    );
  return {
    id: snapshot.id,
    erpHrmTimeTrackingActivityLogEntryId:
      snapshot.erp_hrm_time_tracking_activity_log_entry_id,
    erpHrmTimeTrackingOrganizationId:
      snapshot.erp_hrm_time_tracking_organization_id,
    snapshotActionType: snapshot.snapshot_action_type,
    snapshotActionSummary: snapshot.snapshot_action_summary,
    performerType: snapshot.performer_type,
    performerId: snapshot.performer_id,
    targetEntityType: snapshot.target_entity_type,
    targetEntityId: snapshot.target_entity_id,
    targetAdditionalInfo: snapshot.target_additional_info ?? null,
    createdAt: toISOStringSafe(snapshot.created_at),
    updatedAt: toISOStringSafe(snapshot.updated_at),
    deletedAt: snapshot.deleted_at
      ? toISOStringSafe(snapshot.deleted_at)
      : null,
  };
}
