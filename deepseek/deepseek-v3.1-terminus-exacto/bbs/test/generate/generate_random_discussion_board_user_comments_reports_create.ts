import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment_report } from "../prepare/prepare_random_discussion_board_comment_report";

export async function generate_random_discussion_board_user_comments_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentReport.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentReport> {
  const prepared: IDiscussionBoardCommentReport.ICreate =
    prepare_random_discussion_board_comment_report(props.body);
  const result: IDiscussionBoardCommentReport =
    await api.functional.discussionBoard.user.comments.reports.create(
      connection,
      {
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
