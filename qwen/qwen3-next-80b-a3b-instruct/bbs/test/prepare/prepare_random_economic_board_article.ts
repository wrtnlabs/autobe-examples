import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_board_article(
  input?: DeepPartial<IEconomicBoardArticle.ICreate> | undefined,
): IEconomicBoardArticle.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 3,
        wordMax: 8,
      }),
    section_id:
      input?.section_id ?? typia.random<string & tags.Format<"uuid">>(),
    tags: input?.tags
      ? input.tags.map((tag) => tag)
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<10>
          >(),
          () =>
            RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<5> &
                  tags.Maximum<50>
              >(),
            ),
        ),
    attachment_ids: input?.attachment_ids
      ? input.attachment_ids.map((id) => id)
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<10>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
  };
}
