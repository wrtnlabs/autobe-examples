import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM timelog creation data for E2E testing.
 *
 * Generates a complete IErpHrmTimelog.ICreate with randomized values
 * including a UUID for project assignment, optional task and employee
 * assignments, a valid date string, positive duration in minutes,
 * an optional work description, and a billable flag.
 *
 * All properties can be overridden via the DeepPartial input parameter,
 * allowing tests to customize specific fields while using sensible
 * defaults for the rest.
 */
export function prepare_random_erp_hrm_timelog(
  input?: DeepPartial<IErpHrmTimelog.ICreate>,
): IErpHrmTimelog.ICreate {
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id ?? typia.random<string & tags.Format<"uuid">>(),
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    date: input?.date ?? typia.random<string & tags.Format<"date">>(),
    duration_minutes:
      input?.duration_minutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    billable: input?.billable ?? RandomGenerator.pick([true, false] as const),
  };
}
