import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track employee contract creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackEmployeeContract.ICreate with randomized values
 * including start date, optional end date, pay rate, pay period frequency, weekly
 * working hours, and optional notes.
 *
 * The contract represents employment terms for an employee including compensation
 * details and working hour expectations. When a new contract is created, any
 * existing active contract for the employee is automatically ended.
 */
export function prepare_random_hrm_time_track_employee_contract(
  input?: DeepPartial<IHrmTimeTrackEmployeeContract.ICreate> | undefined,
): IHrmTimeTrackEmployeeContract.ICreate {
  return {
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ??
      (Math.random() > 0.3
        ? typia.random<string & tags.Format<"date-time">>()
        : null),
    pay_rate:
      input?.pay_rate ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
      >(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick(["weekly", "biweekly", "monthly"] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<60>
      >(),
    notes:
      input?.notes ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({ sentences: 3 })
        : null),
  };
}
