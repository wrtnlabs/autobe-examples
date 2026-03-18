import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_role_permission(
  input?: DeepPartial<IHrmTimeTrackingRolePermission.ICreate> | undefined,
): IHrmTimeTrackingRolePermission.ICreate {
  return {
    permissionIds: input?.permissionIds
      ? input.permissionIds.map(
          (permissionId) =>
            permissionId ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(3, () => typia.random<string & tags.Format<"uuid">>()).slice(
          0,
          randint(1, 3),
        ),
  };
}
