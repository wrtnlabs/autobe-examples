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
 * for employment agreements including start dates, compensation rates, pay periods,
 * and working hours.
 */
export function prepare_random_hrm_platform_employee_contract(
  input?: DeepPartial<IHrmPlatformEmployeeContract.ICreate>,
): IHrmPlatformEmployeeContract.ICreate {
  return {
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ??
      (Math.random() > 0.7
        ? null
        : typia.random<string & tags.Format<"date-time">>()),
    pay_rate: input?.pay_rate ?? typia.random<number>(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      typia.random<number & tags.Type<"int32">>(),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
