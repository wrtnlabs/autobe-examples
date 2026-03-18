import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_role_permission(
  input?: DeepPartial<IHrmPlatformRolePermission.ICreate>,
): IHrmPlatformRolePermission.ICreate {
  return {
    permission:
      input?.permission ??
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
