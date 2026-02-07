import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_image(
  input?: DeepPartial<IDiscussionBoardArticleImage.ICreate>,
): IDiscussionBoardArticleImage.ICreate {
  return {
    attachment_file_id:
      input?.attachment_file_id ?? typia.random<string & tags.Format<"uuid">>(),
    display_order:
      input?.display_order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    alt_text: input?.alt_text ?? RandomGenerator.paragraph({ sentences: 1 }),
    caption: input?.caption ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
