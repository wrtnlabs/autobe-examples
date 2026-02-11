import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_community(
  input?: DeepPartial<IRedditPlatformCommunity.ICreate>,
): IRedditPlatformCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.alphabets(8),
    description:
      input?.description ??
      (RandomGenerator.paragraph({ sentences: 2 }) as string | null),
    icon_url:
      input?.icon_url ??
      (typia.random<string & tags.Format<"uri">>() as
        | (string & tags.Format<"uri">)
        | null),
  };
}
