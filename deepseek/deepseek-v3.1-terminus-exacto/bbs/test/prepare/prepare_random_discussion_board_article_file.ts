import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_file(
  input?: DeepPartial<IDiscussionBoardArticleFile.ICreate>,
): IDiscussionBoardArticleFile.ICreate {
  return {
    attachment_file_id:
      input?.attachment_file_id ?? typia.random<string & tags.Format<"uuid">>(),
    display_order:
      input?.display_order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    alt_text:
      input?.alt_text ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
    caption:
      input?.caption ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
  };
}
