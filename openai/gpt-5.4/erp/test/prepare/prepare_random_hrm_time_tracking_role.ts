import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_role(
  input?: DeepPartial<IHrmTimeTrackingRole.ICreate>,
): IHrmTimeTrackingRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    permissions: input?.permissions
      ? input.permissions.map((permission) => ({
          permissions:
            permission.permissions && permission.permissions.length > 0
              ? permission.permissions
              : [
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
                ],
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            permissions: RandomGenerator.sample(
              [
                "org:manage",
                "employee:manage",
                "employee:view",
                "project:manage",
                "project:view",
                "time:manage",
                "time:approve",
                "time:view_all",
                "report:view",
              ],
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9>
              >(),
            ),
          }),
        ),
  };
}
