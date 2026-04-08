import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_role(
  input?: DeepPartial<IErpHrmTimeRole.ICreate> | undefined,
): IErpHrmTimeRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description: input?.description ?? null,
    permissions: input?.permissions
      ? input.permissions.map((permission) => ({
          id: permission.id ?? typia.random<string & tags.Format<"uuid">>(),
          key: permission.key ?? RandomGenerator.alphabets(8),
          description:
            permission.description ??
            RandomGenerator.paragraph({ sentences: 1 }),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            id: typia.random<string & tags.Format<"uuid">>(),
            key: RandomGenerator.alphabets(8),
            description: RandomGenerator.paragraph({ sentences: 1 }),
          }),
        ),
  };
}
