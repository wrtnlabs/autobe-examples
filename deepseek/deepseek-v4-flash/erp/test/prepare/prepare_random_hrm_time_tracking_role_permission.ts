import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking role permission creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackingRolePermission.ICreate with a
 * randomized system permission code. The permission code is randomly selected
 * from the nine valid system permission codes.
 *
 * The returned object includes the `permission_code` property that represents
 * the system permission to assign to a role. When an `input` object is
 * provided with a `permission_code` value, that value is used as-is;
 * otherwise, a random valid permission code is selected.
 *
 * @param input - Optional partial data to customize the generated permission
 *                assignment. Only `permission_code` is supported.
 * @returns A complete IHrmTimeTrackingRolePermission.ICreate object with all
 *          required properties populated.
 */
export function prepare_random_hrm_time_tracking_role_permission(
  input?: DeepPartial<IHrmTimeTrackingRolePermission.ICreate> | undefined,
): IHrmTimeTrackingRolePermission.ICreate {
  return {
    permission_code:
      input?.permission_code ??
      RandomGenerator.pick([
        "org:manage",
        "employee:manage",
        "employee:view",
        "project:manage",
        "project:view",
        "time:manage",
        "time:approve",
        "time:view_all",
        "report:view",
      ] as const),
  };
}
