import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking employee contract creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackingEmployeeContract.ICreate with randomized
 * compensation terms including pay rate, pay period type, working hours per week,
 * and contract duration dates. All properties accept optional DeepPartial input
 * for test-time customization.
 *
 * The function handles the contract creation payload with realistic defaults:
 * - startDate and endDate are generated as ISO date-time strings using typia
 * - payRate is a random uint32 suitable for compensation amounts
 * - payPeriod is randomly selected from the supported period types
 * - workingHoursPerWeek is constrained to a realistic 1-168 hour range
 * - notes, when not provided, receives a short random paragraph
 */
export function prepare_random_hrm_time_tracking_employee_contract(
  input?: DeepPartial<IHrmTimeTrackingEmployeeContract.ICreate>,
): IHrmTimeTrackingEmployeeContract.ICreate {
  return {
    startDate:
      input?.startDate ?? typia.random<string & tags.Format<"date-time">>(),
    endDate:
      input?.endDate ?? typia.random<string & tags.Format<"date-time">>(),
    payRate: input?.payRate ?? typia.random<number & tags.Type<"uint32">>(),
    payPeriod:
      input?.payPeriod ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    workingHoursPerWeek:
      input?.workingHoursPerWeek ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<168>
      >(),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
