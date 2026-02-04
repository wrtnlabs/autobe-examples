import { IEconPoliticBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticleAttachment";
import { IEconPoliticBoardArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticleVersion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_econ_politic_board_article_version(
  input?: DeepPartial<IEconPoliticBoardArticleVersion.ICreate>,
): IEconPoliticBoardArticleVersion.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<number>(),
      }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 10,
      }),
    section_id: typia.random<string & tags.Format<"uuid">>(),
    attachments: input?.attachments
      ? input.attachments.map((attachment) => attachment)
      : ArrayUtil.repeat(
          typia.random<number>(),
          () => ({}),
        ),
    tags: input?.tags
      ? input.tags.map((tag) => tag as string & tags.MaxLength<20>)
      : ArrayUtil.repeat(
          typia.random<number>(),
          () =>
            RandomGenerator.alphabets(
              typia.random<number>(),
            ) as string & tags.MaxLength<20>,
        ),
  };
}