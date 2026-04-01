import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_activity_log_entry_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
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
    } satisfies Prisma.erp_hrm_time_tracking_activity_log_entry_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingActivityLogEntrySnapshot> {
    return {
      id: input.id,
      erpHrmTimeTrackingActivityLogEntryId:
        input.erp_hrm_time_tracking_activity_log_entry_id,
      erpHrmTimeTrackingOrganizationId:
        input.erp_hrm_time_tracking_organization_id,
      snapshotActionType: input.snapshot_action_type,
      snapshotActionSummary: input.snapshot_action_summary,
      performerType: input.performer_type,
      performerId: input.performer_id,
      targetEntityType: input.target_entity_type,
      targetEntityId: input.target_entity_id,
      targetAdditionalInfo: input.target_additional_info ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
