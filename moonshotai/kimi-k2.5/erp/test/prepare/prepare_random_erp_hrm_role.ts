import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_role(
  input?: DeepPartial<IErpHrmRole.ICreate>,
): IErpHrmRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    permissions: input?.permissions
      ? input.permissions.map((perm) => ({
          permission:
            perm.permission ??
            RandomGenerator.pick([
              "organization.manage",
              "employee.view",
              "employee.manage",
              "project.view",
              "project.manage",
              "role.manage",
            ] as const),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            permission: RandomGenerator.pick([
              "organization.manage",
              "employee.view",
              "employee.manage",
              "project.view",
              "project.manage",
              "role.manage",
            ] as const),
          }),
        ),
  };
}
