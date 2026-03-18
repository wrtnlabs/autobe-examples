import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_activity_log_entry_snapshot(
  input?:
    | DeepPartial<IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate>
    | undefined,
): IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate {
  return {
    erpHrmTimeTrackingActivityLogEntryId:
      input?.erpHrmTimeTrackingActivityLogEntryId ??
      typia.random<string & tags.Format<"uuid">>(),
    erpHrmTimeTrackingOrganizationId:
      input?.erpHrmTimeTrackingOrganizationId ??
      typia.random<string & tags.Format<"uuid">>(),
    snapshotActionType: input?.snapshotActionType ?? RandomGenerator.name(2),
    snapshotActionSummary:
      input?.snapshotActionSummary ??
      RandomGenerator.paragraph({ sentences: 2 }),
    performerType:
      input?.performerType ??
      RandomGenerator.pick(["user", "system", "service-account"] as const),
    performerId:
      input?.performerId ?? typia.random<string & tags.Format<"uuid">>(),
    targetEntityType:
      input?.targetEntityType ??
      RandomGenerator.pick([
        "time-entry",
        "project",
        "organization",
        "task",
      ] as const),
    targetEntityId:
      input?.targetEntityId ?? typia.random<string & tags.Format<"uuid">>(),
    targetAdditionalInfo: input?.targetAdditionalInfo ?? null,
  };
}
