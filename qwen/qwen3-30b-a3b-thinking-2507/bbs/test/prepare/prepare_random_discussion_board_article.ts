import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
export function prepare_random_discussion_board_article(
  input?: DeepPartial<IDiscussionBoardArticle.ICreate> | undefined,
): IDiscussionBoardArticle.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences:
          typia.random<number>(),
        wordMin: 2,
        wordMax: 15,
      }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs:
          typia.random<number>(),
        sentenceMin: 2,
        sentenceMax: 5,
        wordMin: 2,
        wordMax: 15,
      }),
  };
}