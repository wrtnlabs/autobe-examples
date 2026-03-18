import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_timelog_snapshot(
  input?: DeepPartial<IErpHrmTimeTrackingTimelogSnapshot.ICreate> | undefined,
): IErpHrmTimeTrackingTimelogSnapshot.ICreate {
  return {
    erp_hrm_time_tracking_timelog_id:
      input?.erp_hrm_time_tracking_timelog_id ??
      typia.random<string & tags.Format<"uuid">>(),
    task_id:
      input?.task_id !== undefined
        ? input.task_id === null
          ? null
          : (input.task_id ?? typia.random<string & tags.Format<"uuid">>())
        : Math.random() < 0.5
          ? null
          : typia.random<string & tags.Format<"uuid">>(),
    timesheet_id:
      input?.timesheet_id !== undefined
        ? input.timesheet_id === null
          ? null
          : (input.timesheet_id ?? typia.random<string & tags.Format<"uuid">>())
        : Math.random() < 0.5
          ? null
          : typia.random<string & tags.Format<"uuid">>(),
    source_timer_session_id:
      input?.source_timer_session_id !== undefined
        ? input.source_timer_session_id === null
          ? null
          : (input.source_timer_session_id ??
            typia.random<string & tags.Format<"uuid">>())
        : Math.random() < 0.5
          ? null
          : typia.random<string & tags.Format<"uuid">>(),
    started_at:
      input?.started_at ??
      RandomGenerator.date(
        new Date(2026, 2, 18),
        1000 * 60 * 60 * 24,
      ).toISOString(),
    ended_at:
      input?.ended_at ??
      (() => {
        const start = new Date(
          input?.started_at ??
            RandomGenerator.date(
              new Date(2026, 2, 18),
              1000 * 60 * 60 * 24,
            ).toISOString(),
        );
        const end = new Date(start.getTime() + 1000 * 60 * 30);
        return end.toISOString();
      })(),
    duration_minutes:
      input?.duration_minutes ?? typia.random<number & tags.Type<"int32">>(),
    work_description:
      input?.work_description ?? RandomGenerator.paragraph({ sentences: 3 }),
    workflow_status:
      input?.workflow_status ??
      RandomGenerator.pick([
        "draft",
        "submitted",
        "approved",
        "rejected",
      ] as const),
  };
}
