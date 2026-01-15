import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
export function prepare_random_discussion_board_comment_report(
  input?: DeepPartial<IDiscussionBoardCommentReport.ICreate>,
): IDiscussionBoardCommentReport.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.pick([
        "spam",
        "hate_speech",
        "harassment",
        "inaccurate",
        "other",
      ] as const),
  };
}
