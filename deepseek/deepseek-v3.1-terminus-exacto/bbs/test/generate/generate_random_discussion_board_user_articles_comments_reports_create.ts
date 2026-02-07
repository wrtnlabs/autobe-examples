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

export async function generate_random_discussion_board_user_articles_comments_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentReport.ICreate>;
    params: {
      articleId: string;
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentReport> {
  const prepared: IDiscussionBoardCommentReport.ICreate =
    prepare_random_discussion_board_comment_report(props.body);
  const result: IDiscussionBoardCommentReport =
    await api.functional.discussionBoard.user.articles.comments.reports.create(
      connection,
      {
        body: prepared,
        articleId: props.params.articleId,
        commentId: props.params.commentId,
      },
    );
  return result;
}
