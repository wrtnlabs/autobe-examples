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

export async function getDiscussionBoardAdminArticlesArticleIdCommentsCommentIdReportsReportId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentReport> {
  // First verify that the comment exists and belongs to the specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      article: { id: props.articleId },
    },
  });
  if (!comment) {
    throw new HttpException(
      "Comment not found or does not belong to the specified article",
      404,
    );
  }
  // Then retrieve the specific report
  const report =
    await MyGlobal.prisma.discussion_board_comment_reports.findUnique({
      where: {
        id: props.reportId,
        reported_comment_id: props.commentId,
      },
      ...DiscussionBoardCommentReportTransformer.select(),
    });
  if (!report) {
    throw new HttpException(
      "Report not found or does not belong to the specified comment",
      404,
    );
  }
  return await DiscussionBoardCommentReportTransformer.transform(report);
}
