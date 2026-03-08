import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_political_board_article(
  input?: DeepPartial<IEconomicPoliticalBoardArticle.ICreate>,
): IEconomicPoliticalBoardArticle.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 8,
        sentenceMax: 15,
        wordMin: 5,
        wordMax: 10,
      }),
    section_id:
      input?.section_id ?? typia.random<string & tags.Format<"uuid">>(),
    tagIds: input?.tagIds
      ? input.tagIds.map(
          (tagId) => tagId ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
    attachmentData: input?.attachmentData
      ? input.attachmentData.map((attachment) => ({
          file_url:
            attachment.file_url ?? typia.random<string & tags.Format<"uri">>(),
          file_name: attachment.file_name ?? RandomGenerator.alphaNumeric(12),
          file_type:
            attachment.file_type ??
            RandomGenerator.pick(["image", "file"] as const),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            file_url: typia.random<string & tags.Format<"uri">>(),
            file_name: RandomGenerator.alphaNumeric(12),
            file_type: RandomGenerator.pick(["image", "file"] as const),
          }),
        ),
  };
}
