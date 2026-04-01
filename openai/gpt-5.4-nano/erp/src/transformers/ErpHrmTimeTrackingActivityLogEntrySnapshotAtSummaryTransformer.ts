import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingActivityLogEntrySnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_activity_log_entry_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
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
        activityLogEntry: {
          select: {
            id: true,
          },
        },
        organization: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_activity_log_entry_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_action_type: input.snapshot_action_type,
      snapshot_action_summary: input.snapshot_action_summary,
      performer_type: input.performer_type,
      performer_id: input.performer_id,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      target_additional_info: input.target_additional_info ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
