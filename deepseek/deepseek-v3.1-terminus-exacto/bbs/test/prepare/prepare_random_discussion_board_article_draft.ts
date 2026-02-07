import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_draft(
  input?: DeepPartial<IDiscussionBoardArticleDraft.ICreate> | undefined,
): IDiscussionBoardArticleDraft.ICreate {
  return {
    draft_title:
      input?.draft_title ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
        >(),
      }),
    draft_content:
      input?.draft_content ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
      }),
    recovery_data:
      input?.recovery_data !== undefined
        ? input.recovery_data
        : typia.random<string & tags.Format<"uuid">>(),
  };
}
