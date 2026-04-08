import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track timer creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackTimer.ICreate with randomized values for
 * starting a live time tracking session. The project_id is required to establish
 * which project the time will be tracked against. Task association is optional
 * for more granular tracking at the task level within the project. A description
 * can be provided to document the specific work being performed.
 */
export function prepare_random_hrm_time_track_timer(
  input?: DeepPartial<IHrmTimeTrackTimer.ICreate> | undefined,
): IHrmTimeTrackTimer.ICreate {
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id ?? typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
