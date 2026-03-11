import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article(
  input?: DeepPartial<IDiscussionBoardArticle.ICreate>,
): IDiscussionBoardArticle.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    sectionId: input?.sectionId ?? typia.random<string & tags.Format<"uuid">>(),
    fileUrls: input?.fileUrls
      ? input.fileUrls.map(
          (url) => url ?? typia.random<string & tags.Format<"uri">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
          >(),
          () => typia.random<string & tags.Format<"uri">>(),
        ),
    imageUrls: input?.imageUrls
      ? input.imageUrls.map(
          (url) => url ?? typia.random<string & tags.Format<"uri">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
          >(),
          () => typia.random<string & tags.Format<"uri">>(),
        ),
    tags: input?.tags
      ? input.tags.map((tag) => tag ?? RandomGenerator.alphabets(6))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5>
          >(),
          () => RandomGenerator.alphabets(6),
        ),
  };
}
