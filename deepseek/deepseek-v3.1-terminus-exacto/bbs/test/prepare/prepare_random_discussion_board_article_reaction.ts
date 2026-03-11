import { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_reaction(
  input?: DeepPartial<IDiscussionBoardArticleReaction.ICreate> | undefined,
): IDiscussionBoardArticleReaction.ICreate {
  return {
    discussion_board_article_id:
      input?.discussion_board_article_id ??
      typia.random<string & tags.Format<"uuid">>(),
    reaction_type:
      input?.reaction_type ??
      RandomGenerator.pick([
        "like",
        "helpful",
        "insightful",
        "agree",
        "disagree",
        "surprise",
        "love",
        "funny",
      ] as const),
  };
}
