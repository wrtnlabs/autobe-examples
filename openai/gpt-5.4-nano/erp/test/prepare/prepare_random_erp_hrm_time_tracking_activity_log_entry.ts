import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_activity_log_entry(
  input?: DeepPartial<IErpHrmTimeTrackingActivityLogEntry.ICreate> | undefined,
): IErpHrmTimeTrackingActivityLogEntry.ICreate {
  return {
    action_type: input?.action_type ?? RandomGenerator.name(3),
    target_entity_type:
      input?.target_entity_type ??
      RandomGenerator.pick([
        "erp_employee",
        "erp_project",
        "erp_task",
        "erp_timesheet",
      ] as const),
    target_entity_id:
      input?.target_entity_id ?? typia.random<string & tags.Format<"uuid">>(),
    summary: input?.summary ?? RandomGenerator.paragraph({ sentences: 2 }),
    details: input?.details ?? null,
    occurred_at:
      input?.occurred_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
