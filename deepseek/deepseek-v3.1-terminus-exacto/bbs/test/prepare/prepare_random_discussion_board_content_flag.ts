import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_content_flag(
  input?: DeepPartial<IDiscussionBoardContentFlag.ICreate> | undefined,
): IDiscussionBoardContentFlag.ICreate {
  return {
    flag_reason:
      input?.flag_reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    flagged_article_id:
      input?.flagged_article_id ?? typia.random<string & tags.Format<"uuid">>(),
    flagged_comment_id:
      input?.flagged_comment_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
