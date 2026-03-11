import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivity";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentActivity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentActivityAtSummaryTransformer } from "../transformers/DiscussionBoardCommentActivityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdCommentsCommentIdActivities(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentActivity.IRequest;
}): Promise<IPageIDiscussionBoardCommentActivity.ISummary> {
  // Verify article and comment exist with relationship
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
    select: { id: true },
  });
  if (!comment) {
    throw new HttpException(
      "Comment not found or does not belong to article",
      404,
    );
  }
  // Build WHERE clause
  const whereInput = {
    comment_id: props.commentId,
    ...(props.body.action && { action: props.body.action }),
    ...(props.body.start_date && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date && {
      created_at: { lte: new Date(props.body.end_date) },
    }),
  } satisfies Prisma.discussion_board_comment_activitiesWhereInput;
  // Handle text search if provided
  if (props.body.search) {
    (whereInput as any).action = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Fetch activities with transformer
  const data =
    await MyGlobal.prisma.discussion_board_comment_activities.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardCommentActivityAtSummaryTransformer.select(),
    });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentActivityAtSummaryTransformer.transform,
  );
  // Count total
  const total = await MyGlobal.prisma.discussion_board_comment_activities.count(
    {
      where: whereInput,
    },
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
