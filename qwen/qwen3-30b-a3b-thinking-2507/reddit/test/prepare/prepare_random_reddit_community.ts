import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community(
  input?: DeepPartial<IRedditCommunity.ICreate> | undefined,
): IRedditCommunity.ICreate {
  return {
    name:
      input?.name ??
      typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<25> &
          tags.Pattern<"^[a-zA-Z0-9_-]{3,25}$">
      >(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 3,
        wordMin: 10,
        wordMax: 15,
      }),
    icon_url:
      input?.icon_url ??
      typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
  };
}
