import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM contract creation data for E2E testing.
 *
 * Generates a complete IHrmContract.ICreate with randomized values for employment
 * contract testing scenarios. Includes compensation terms, effective dates, and
 * optional working hours and notes.
 */
export function prepare_random_hrm_contract(
  input?: DeepPartial<IHrmContract.ICreate> | undefined,
): IHrmContract.ICreate {
  return {
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ??
      RandomGenerator.pick([
        typia.random<string & tags.Format<"date-time">>(),
        null,
      ]),
    pay_rate:
      input?.pay_rate ??
      typia.random<
        number & tags.Type<"double"> & tags.Minimum<15> & tags.Maximum<10000>
      >(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      RandomGenerator.pick([
        typia.random<
          number & tags.Type<"double"> & tags.Minimum<20> & tags.Maximum<50>
        >(),
        null,
      ]),
    notes:
      input?.notes ??
      RandomGenerator.pick([RandomGenerator.paragraph({ sentences: 2 }), null]),
  };
}
