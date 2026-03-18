import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_role_permission(
  input?: DeepPartial<IHrmTimeTrackingRolePermission.ICreate>,
): IHrmTimeTrackingRolePermission.ICreate {
  const PERMISSIONS = [
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
    permissions: input?.permissions
      ? input.permissions.length
        ? input.permissions.map(
            (permission) => permission ?? RandomGenerator.pick(PERMISSIONS),
          )
        : [RandomGenerator.pick(PERMISSIONS)]
      : RandomGenerator.sample(
          [...PERMISSIONS],
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        ),
  };
}
