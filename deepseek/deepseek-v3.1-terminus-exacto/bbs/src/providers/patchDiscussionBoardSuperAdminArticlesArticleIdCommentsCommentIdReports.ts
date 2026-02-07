import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardCommentAtSummaryReportTransformer } from "../transformers/DiscussionBoardCommentAtSummaryReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentIdReports(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequestReport;
}): Promise<IPageIDiscussionBoardComment.ISummaryReport> {
  // Verify comment exists and belongs to the article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      article: {
        id: props.articleId,
      },
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found in the specified article", 404);
  }
  // Build WHERE clause with proper date handling - convert ISO strings to Date for Prisma
  const whereInput = {
    reported_comment_id: props.commentId,
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}),
    ...(props.body.reporter && {
      reporter: {
        display_name: {
          contains: props.body.reporter,
          mode: "insensitive" as const,
        },
      },
    }),
    ...(props.body.created_at_min && {
      created_at: {
        gte: new Date(props.body.created_at_min),
      },
    }),
    ...(props.body.created_at_max && {
      created_at: {
        lte: new Date(props.body.created_at_max),
      },
    }),
  } satisfies Prisma.discussion_board_comment_reportsWhereInput;
  // Pagination with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Get data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardCommentAtSummaryReportTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_comment_reports.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentAtSummaryReportTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
