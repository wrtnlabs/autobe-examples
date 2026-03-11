import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
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
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
    sectionId: input?.sectionId ?? typia.random<string & tags.Format<"uuid">>(),
    tags: input?.tags
      ? input.tags.map(
          (tag) =>
            tag ?? typia.random<string & tags.Pattern<"^[a-zA-Z0-9-]+$">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Pattern<"^[a-zA-Z0-9-]+$">>(),
        ),
    attachments: input?.attachments
      ? input.attachments.map((attachment) => ({
          file_url:
            attachment?.file_url ?? typia.random<string & tags.Format<"uri">>(),
          file_name:
            attachment?.file_name ?? RandomGenerator.alphaNumeric(12) + ".pdf",
          file_type:
            attachment?.file_type ??
            RandomGenerator.pick(["image", "file"] as const),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            file_url: typia.random<string & tags.Format<"uri">>(),
            file_name: RandomGenerator.alphaNumeric(12) + ".pdf",
            file_type: RandomGenerator.pick(["image", "file"] as const),
          }),
        ),
  };
}
