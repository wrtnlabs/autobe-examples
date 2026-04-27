import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking employee snapshot creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackingEmployeeSnapshot.ICreate with randomized values
 * representing a manual audit checkpoint. The snapshot records which field changed, what
 * the old value was, and what the new value is.
 *
 * @param input Optional partial data to override specific fields
 * @returns A complete IHrmTimeTrackingEmployeeSnapshot.ICreate with generated data
 */
export function prepare_random_hrm_time_tracking_employee_snapshot(
  input?: DeepPartial<IHrmTimeTrackingEmployeeSnapshot.ICreate> | undefined,
): IHrmTimeTrackingEmployeeSnapshot.ICreate {
  return {
    changed_field:
      input?.changed_field ??
      RandomGenerator.pick([
        "status",
        "employment_type",
        "position",
        "role_id",
        "department_id",
      ] as const),
    old_value:
      input?.old_value !== undefined
        ? input.old_value
        : Math.random() > 0.3
          ? RandomGenerator.name(2)
          : null,
    new_value:
      input?.new_value !== undefined
        ? input.new_value
        : Math.random() > 0.3
          ? RandomGenerator.name(2)
          : null,
  };
}
