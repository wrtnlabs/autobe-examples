import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";

export function prepare_random_discussion_board_moderation_queue(
  input?: DeepPartial<IDiscussionBoardModerationQueue.ICreate> | undefined,
): IDiscussionBoardModerationQueue.ICreate {
  return {
    articleId: input?.articleId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}