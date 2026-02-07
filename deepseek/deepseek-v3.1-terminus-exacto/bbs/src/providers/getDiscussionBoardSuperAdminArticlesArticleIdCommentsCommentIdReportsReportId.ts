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

export async function getDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentIdReportsReportId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentReport> {
  // Validate hierarchical relationships and fetch report in single query
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
    throw new HttpException(
      "Report not found or does not belong to the specified comment and article hierarchy",
      404,
    );
  }
  // Transform database record to API response
  return await DiscussionBoardCommentReportTransformer.transform(report);
}
