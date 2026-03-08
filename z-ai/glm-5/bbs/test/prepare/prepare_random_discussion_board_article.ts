import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article(
  input?: DeepPartial<IDiscussionBoardArticle.ICreate>,
): IDiscussionBoardArticle.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    content:
      input?.content ??
      RandomGenerator.content({ paragraphs: 2, sentenceMin: 5 }),
    section_id:
      input?.section_id ?? typia.random<string & tags.Format<"uuid">>(),
    tag_ids: input?.tag_ids
      ? input.tag_ids.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
    attachments: input?.attachments
      ? input.attachments.map((att) => ({
          type: att.type ?? RandomGenerator.pick(["file", "image"] as const),
          name: att.name ?? RandomGenerator.alphabets(8),
          extension:
            att.extension ??
            RandomGenerator.pick(["pdf", "jpg", "png"] as const),
          size:
            att.size ??
            typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<1000000>
            >(),
          url: att.url ?? typia.random<string & tags.Format<"uri">>(),
        }))
      : undefined,
  };
}
