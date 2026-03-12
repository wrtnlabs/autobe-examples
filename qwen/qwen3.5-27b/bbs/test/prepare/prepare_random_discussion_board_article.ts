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
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    content: input?.content ?? RandomGenerator.content({ paragraphs: 2 }),
    section_id:
      input?.section_id ?? typia.random<string & tags.Format<"uuid">>(),
    tags: input?.tags
      ? input.tags.map((tag) => tag)
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
          >(),
          () => RandomGenerator.alphabets(8),
        ),
  };
}
