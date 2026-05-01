import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM timer creation data for E2E testing.
 *
 * Generates a complete IErpHrmTimer.ICreate with randomized values for
 * starting a live time tracking session. The project ID and optional task
 * ID default to random UUIDs suitable for testing. The description defaults
 * to a short paragraph of realistic text.
 *
 * All properties accept DeepPartial overrides, allowing tests to inject
 * known project/task IDs or specific descriptions as needed. The optional
 * task ID and description can also be explicitly set to null through the
 * input to test null-handling paths.
 */
export function prepare_random_erp_hrm_timer(
  input?: DeepPartial<IErpHrmTimer.ICreate>,
): IErpHrmTimer.ICreate {
  return {
    erp_hrm_project_id:
      input?.erp_hrm_project_id ?? typia.random<string & tags.Format<"uuid">>(),
    erp_hrm_task_id:
      input?.erp_hrm_task_id ?? typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
