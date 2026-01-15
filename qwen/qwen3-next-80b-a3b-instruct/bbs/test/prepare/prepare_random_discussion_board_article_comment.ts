import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
export function prepare_random_discussion_board_article_comment(
  input?: DeepPartial<IDiscussionBoardArticleComment.ICreate> | undefined,
): IDiscussionBoardArticleComment.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 4,
        wordMax: 10,
      }),
    parent_id: input?.parent_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
