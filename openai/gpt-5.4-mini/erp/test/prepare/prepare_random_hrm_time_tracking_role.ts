import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_role(
  input?: DeepPartial<IHrmTimeTrackingRole.ICreate> | undefined,
): IHrmTimeTrackingRole.ICreate {
  return {
    name: input?.name ?? `Role ${RandomGenerator.name(2)}`,
    code:
      input?.code !== undefined ? input.code : RandomGenerator.alphabets(10),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 2 }),
    sortOrder: input?.sortOrder ?? typia.random<number & tags.Type<"int32">>(),
    permissionIds:
      input?.permissionIds !== undefined
        ? input.permissionIds.map(
            (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
          )
        : ArrayUtil.repeat(3, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
  };
}
