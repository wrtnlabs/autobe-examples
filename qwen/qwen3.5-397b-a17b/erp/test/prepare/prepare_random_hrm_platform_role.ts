import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_role(
  input?: DeepPartial<IHrmPlatformRole.ICreate>,
): IHrmPlatformRole.ICreate {
  const validPermissions = [
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
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 3 }),
    permissions: input?.permissions
      ? input.permissions.map((permission) => ({
          permission:
            permission.permission ?? RandomGenerator.pick(validPermissions),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            permission: RandomGenerator.pick(validPermissions),
          }),
        ),
  };
}
