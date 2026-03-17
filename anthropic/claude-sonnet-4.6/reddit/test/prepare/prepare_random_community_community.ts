import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_community(
  input?: DeepPartial<ICommunityCommunity.ICreate> | undefined,
): ICommunityCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 2 }),
    icon_url:
      input?.icon_url !== undefined
        ? input.icon_url
        : typia.random<string & tags.Format<"url">>(),
  };
}
