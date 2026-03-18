import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingActivityLogEntrySnapshotCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate;
  }) {
    return {
      id: v4(),
      snapshot_action_type: props.body.snapshotActionType,
      snapshot_action_summary: props.body.snapshotActionSummary,
      performer_type: props.body.performerType,
      performer_id: props.body.performerId,
      target_entity_type: props.body.targetEntityType,
      target_entity_id: props.body.targetEntityId,
      target_additional_info: props.body.targetAdditionalInfo ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      activityLogEntry: {
        connect: { id: props.body.erpHrmTimeTrackingActivityLogEntryId },
      },
      organization: {
        connect: { id: props.body.erpHrmTimeTrackingOrganizationId },
      },
    } satisfies Prisma.erp_hrm_time_tracking_activity_log_entry_snapshotsCreateInput;
  }
}
