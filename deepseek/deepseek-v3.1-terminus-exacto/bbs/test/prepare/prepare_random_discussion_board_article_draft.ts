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
      input?.draft_title ?? RandomGenerator.paragraph({ sentences: 3 }),
    draft_content:
      input?.draft_content ?? RandomGenerator.content({ paragraphs: 2 }),
    draft_status:
      input?.draft_status ??
      RandomGenerator.pick(["draft", "auto-save", "pending-review"] as const),
    recovery_data: input?.recovery_data
      ? Object.fromEntries(
          Object.entries(input.recovery_data).map(([key, value]) => [
            key,
            value ?? RandomGenerator.alphabets(8),
          ]),
        )
      : { example: RandomGenerator.alphabets(8) },
  };
}
