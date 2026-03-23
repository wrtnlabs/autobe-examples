import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_community(
  input?: DeepPartial<IRedditCloneCommunity.ICreate> | undefined,
): IRedditCloneCommunity.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 5 }),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    icon: input?.icon ?? typia.random<string & tags.Format<"url">>(),
  };
}
