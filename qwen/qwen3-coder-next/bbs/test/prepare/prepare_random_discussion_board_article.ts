import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article(
  input?: DeepPartial<IDiscussionBoardArticle.ICreate> | undefined,
): IDiscussionBoardArticle.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 15 }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 8,
        sentenceMax: 15,
        wordMin: 4,
        wordMax: 10,
      }),
    section_id:
      input?.section_id ?? typia.random<string & tags.Format<"uuid">>(),
    tags: input?.tags
      ? input.tags
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<4>
          >(),
          () => RandomGenerator.alphabets(6),
        ),
  };
}
