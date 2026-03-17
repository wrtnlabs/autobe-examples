import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_comment(
  input?: DeepPartial<IRedditCommunityComment.ICreate> | undefined,
): IRedditCommunityComment.ICreate {
  return {
    body:
      input?.body ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 8,
        wordMin: 5,
        wordMax: 10,
      }),
    parent_comment_id:
      input?.parent_comment_id ??
      RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"uuid">>(),
      ] as const),
  };
}
