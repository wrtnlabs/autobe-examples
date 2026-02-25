import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_content_flag(
  input?: DeepPartial<IDiscussionBoardContentFlag.ICreate>,
): IDiscussionBoardContentFlag.ICreate {
  // Randomly decide whether to flag an article or comment
  const flagArticle = Math.random() < 0.5;
  return {
    flagged_article_id:
      input?.flagged_article_id ??
      (flagArticle ? typia.random<string & tags.Format<"uuid">>() : null),
    flagged_comment_id:
      input?.flagged_comment_id ??
      (flagArticle ? null : typia.random<string & tags.Format<"uuid">>()),
    flag_reason:
      input?.flag_reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
      }),
  };
}
