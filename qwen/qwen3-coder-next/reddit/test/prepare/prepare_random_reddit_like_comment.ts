import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_comment(
  input?: DeepPartial<IRedditLikeComment.ICreate>,
): IRedditLikeComment.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 15 }),
    parent_comment_id:
      input?.parent_comment_id ??
      (Math.random() > 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
