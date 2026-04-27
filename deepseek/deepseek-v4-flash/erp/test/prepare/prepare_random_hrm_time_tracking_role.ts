import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking role creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackingRole.ICreate with randomized values.
 * The role name is generated as a random human-readable name. The permissions
 * array is populated with a random subset of valid system permission codes
 * ensuring at least one permission is assigned.
 *
 * Both properties are overridable via the DeepPartial input parameter for
 * test-specific customization.
 *
 * @param input DeepPartial input for test-time customization of specific fields
 * @returns A complete IHrmTimeTrackingRole.ICreate record
 */
export function prepare_random_hrm_time_tracking_role(
  input?: DeepPartial<IHrmTimeTrackingRole.ICreate> | undefined,
): IHrmTimeTrackingRole.ICreate {
  const PERMISSION_CODES = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  return {
    name: input?.name ?? RandomGenerator.name(),
    permissions: input?.permissions?.length
      ? input.permissions
      : RandomGenerator.sample(
          [...PERMISSION_CODES],
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9>
          >(),
        ),
  };
}
