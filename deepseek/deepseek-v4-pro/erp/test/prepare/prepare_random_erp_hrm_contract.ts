import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM employment contract creation data for E2E testing.
 *
 * Generates a complete IErpHrmContract.ICreate with randomized values for
 * compensation terms including pay rate, pay period, working hours per week,
 * and effective date range. The employee is identified by the `employeeId`
 * path parameter and must not be included in the request body.
 *
 * When a new contract is created, the system automatically closes the
 * employee's previous active contract by setting its end date to the day
 * before the new contract's start date, ensuring only one contract is active
 * at any given time while preserving all past contracts as immutable
 * historical records.
 */
export function prepare_random_erp_hrm_contract(
  input?: DeepPartial<IErpHrmContract.ICreate>,
): IErpHrmContract.ICreate {
  return {
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date: input?.end_date !== undefined ? input.end_date : null,
    pay_rate: input?.pay_rate ?? typia.random<number>(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick(["hourly", "monthly", "yearly", "weekly"] as const),
    working_hours_per_week:
      input?.working_hours_per_week ?? typia.random<number>(),
    notes: input?.notes !== undefined ? input.notes : null,
  };
}
