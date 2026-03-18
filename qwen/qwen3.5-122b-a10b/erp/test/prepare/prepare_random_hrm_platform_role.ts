import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_role(
  input?: DeepPartial<IHrmPlatformRole.ICreate> | undefined,
): IHrmPlatformRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    permission_ids: input?.permission_ids
      ? input.permission_ids.map((permission) => ({
          id: permission.id ?? typia.random<string & tags.Format<"uuid">>(),
          code: permission.code ?? RandomGenerator.alphabets(8),
          name: permission.name ?? RandomGenerator.name(2),
          description:
            permission.description ??
            RandomGenerator.paragraph({ sentences: 2 }),
          category:
            permission.category ??
            RandomGenerator.pick([
              "org",
              "employee",
              "project",
              "time",
              "report",
            ] as const),
          created_at:
            permission.created_at ??
            typia.random<string & tags.Format<"date-time">>(),
          updated_at:
            permission.updated_at ??
            typia.random<string & tags.Format<"date-time">>(),
          deleted_at: permission.deleted_at ?? null,
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            id: typia.random<string & tags.Format<"uuid">>(),
            code: RandomGenerator.alphabets(8),
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            category: RandomGenerator.pick([
              "org",
              "employee",
              "project",
              "time",
              "report",
            ] as const),
            created_at: typia.random<string & tags.Format<"date-time">>(),
            updated_at: typia.random<string & tags.Format<"date-time">>(),
            deleted_at: null,
          }),
        ),
  };
}
