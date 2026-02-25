import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_community(
  input?: DeepPartial<IRedditCloneCommunity.ICreate>,
): IRedditCloneCommunity.ICreate {
  const descriptionValue =
    input?.description ??
    (Math.random() < 0.3
      ? undefined
      : RandomGenerator.paragraph({ sentences: 3 }));
  const iconUrlValue =
    input?.icon_url ??
    (Math.random() < 0.3
      ? undefined
      : `https://example.com/icons/${RandomGenerator.alphabets(8)}.png`);
  return {
    name: input?.name ?? RandomGenerator.alphabets(8),
    description: descriptionValue,
    icon_url: iconUrlValue,
  };
}
