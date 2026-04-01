import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

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
export function prepare_random_hrm_platform_role(
  input?: DeepPartial<IHrmPlatformRole.ICreate>,
): IHrmPlatformRole.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 3 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    permissions: input?.permissions
      ? input.permissions.map(
          (permission) => permission ?? RandomGenerator.pick(PERMISSION_CODES),
        )
      : RandomGenerator.sample(
          [...PERMISSION_CODES],
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        ),
  };
}