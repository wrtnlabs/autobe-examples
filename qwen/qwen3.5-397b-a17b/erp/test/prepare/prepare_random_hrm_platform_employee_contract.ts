import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform employee contract creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformEmployeeContract.ICreate with randomized values
 * for all employment contract fields including employee reference, contract dates,
 * compensation details, working hours, and optional notes.
 *
 * The function supports partial input overrides through DeepPartial, allowing tests
 * to customize specific fields while auto-generating the rest. Optional fields
 * (end_date, notes) may be set to null or generated with random values.
 *
 * @param input - Optional partial input to override specific fields
 * @returns Complete IHrmPlatformEmployeeContract.ICreate object
 */
export function prepare_random_hrm_platform_employee_contract(
  input?: DeepPartial<IHrmPlatformEmployeeContract.ICreate>,
): IHrmPlatformEmployeeContract.ICreate {
  return {
    hrm_platform_employee_id:
      input?.hrm_platform_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date !== undefined
        ? input.end_date
        : RandomGenerator.pick([true, false])
          ? null
          : typia.random<string & tags.Format<"date-time">>(),
    pay_rate:
      input?.pay_rate ??
      typia.random<number & tags.Type<"double"> & tags.ExclusiveMinimum<0>>(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<80>
      >(),
    notes:
      input?.notes !== undefined
        ? input.notes
        : RandomGenerator.pick([true, false])
          ? RandomGenerator.paragraph({ sentences: 2 })
          : null,
  };
}
