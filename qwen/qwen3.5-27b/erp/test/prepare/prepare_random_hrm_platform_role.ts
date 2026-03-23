import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_role(
  input?: DeepPartial<IHrmPlatformRole.ICreate>,
): IHrmPlatformRole.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(1),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    permissions:
      input?.permissions ??
      ArrayUtil.repeat(3, () => RandomGenerator.alphabets(6)),
  };
}
