import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import { prepare_random_discussion_board_comment_report } from "../prepare/prepare_random_discussion_board_comment_report";
export async function generate_random_discussion_board_citizen_comments_reports_patch_by_commentid(
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
  return await api.functional.discussionBoard.citizen.comments.reports.patchByCommentid(
    connection,
    {
      body: prepared,
      commentId: props.params.commentId,
    },
  );
}
