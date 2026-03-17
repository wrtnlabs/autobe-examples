import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_community(
  input?: DeepPartial<IRedditCloneCommunity.ICreate>,
): IRedditCloneCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(1),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    icon: input?.icon ?? typia.random<string & tags.MaxLength<80000>>(),
  };
}
