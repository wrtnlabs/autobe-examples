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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardCommentReportTransformer } from "../transformers/DiscussionBoardCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentIdReportsReportId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentReport.IUpdate;
}): Promise<IDiscussionBoardCommentReport> {
  // First verify the report exists and belongs to the specified comment and article
  const report =
    await MyGlobal.prisma.discussion_board_comment_reports.findFirst({
      where: {
        id: props.reportId,
        reported_comment_id: props.commentId,
        reportedComment: {
          discussion_board_article_id: props.articleId,
        },
      },
      ...DiscussionBoardCommentReportTransformer.select(),
    });
  if (!report) {
    throw new HttpException("Comment report not found", 404);
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_comment_reportsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Only update fields that are provided in the request body
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    // Handle resolved_at based on status
    if (props.body.status === "resolved") {
      updateData.resolved_at = toISOStringSafe(new Date());
    } else if (props.body.status !== "resolved" && report.resolved_at) {
      // Clear resolved_at if status changes from resolved to something else
      updateData.resolved_at = null;
    }
  }
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
