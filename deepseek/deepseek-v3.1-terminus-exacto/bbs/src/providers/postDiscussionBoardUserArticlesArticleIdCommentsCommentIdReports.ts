import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentReportCollector } from "../collectors/DiscussionBoardCommentReportCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentReportTransformer } from "../transformers/DiscussionBoardCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdCommentsCommentIdReports(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentReport.ICreate;
}): Promise<IDiscussionBoardCommentReport> {
  // Validate article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
  });
  if (!article) throw new HttpException("Article not found", 404);
  // Validate comment exists and belongs to article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      article: { id: props.articleId, deleted_at: null },
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  // Check for existing report
  const existingReport =
    await MyGlobal.prisma.discussion_board_comment_reports.findUnique({
      where: {
        reporter_user_id_reported_comment_id: {
          reporter_user_id: props.user.id,
          reported_comment_id: props.commentId,
        },
      },
    });
  if (existingReport)
    throw new HttpException("You have already reported this comment", 400);
  // Create the report using collector
  const created = await MyGlobal.prisma.discussion_board_comment_reports.create(
    {
      data: await DiscussionBoardCommentReportCollector.collect({
        body: props.body,
        discussionBoardUsers: { id: props.user.id },
        discussionBoardComments: { id: props.commentId },
      }),
      ...DiscussionBoardCommentReportTransformer.select(),
    },
  );
  // Transform and return
  return await DiscussionBoardCommentReportTransformer.transform(created);
}
