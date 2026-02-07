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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentReportTransformer } from "../transformers/DiscussionBoardCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesArticleIdCommentsCommentIdReportsReportId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentReport.IUpdate;
}): Promise<IDiscussionBoardCommentReport> {
  // First, verify the comment exists and belongs to the specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, discussion_board_article_id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }
  // Verify the report exists and belongs to the specified comment
  const existingReport =
    await MyGlobal.prisma.discussion_board_comment_reports.findUnique({
      where: { id: props.reportId },
      select: { id: true, reported_comment_id: true, status: true },
    });
  if (!existingReport) {
    throw new HttpException("Report not found", 404);
  }
  if (existingReport.reported_comment_id !== props.commentId) {
    throw new HttpException(
      "Report does not belong to the specified comment",
      400,
    );
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_comment_reportsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Handle status changes
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    // If status is changing to 'resolved', set resolved_at
    if (
      props.body.status === "resolved" &&
      existingReport.status !== "resolved"
    ) {
      updateData.resolved_at = toISOStringSafe(new Date());
    } else if (
      props.body.status !== "resolved" &&
      existingReport.status === "resolved"
    ) {
      // If status is changing away from 'resolved', clear resolved_at
      updateData.resolved_at = null;
    }
  }
  // Handle other field updates
  if (props.body.reason !== undefined) {
    updateData.reason = props.body.reason;
  }
  if (props.body.resolution_details !== undefined) {
    updateData.resolution_details = props.body.resolution_details;
  }
  // Perform the update
  const updatedReport =
    await MyGlobal.prisma.discussion_board_comment_reports.update({
      where: { id: props.reportId },
      data: updateData,
      ...DiscussionBoardCommentReportTransformer.select(),
    });
  return await DiscussionBoardCommentReportTransformer.transform(updatedReport);
}
