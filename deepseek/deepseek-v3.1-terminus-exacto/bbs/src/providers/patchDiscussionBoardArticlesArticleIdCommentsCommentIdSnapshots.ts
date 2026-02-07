import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardCommentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdCommentsCommentIdSnapshots(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardCommentSnapshot.ISummary> {
  // Verify comment exists and belongs to specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { discussion_board_article_id: true },
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
  // Build WHERE clause with filters
  const whereInput: Prisma.discussion_board_comment_snapshotsWhereInput = {
    discussion_board_comment_id: props.commentId,
  };
  // Apply version number filters
  if (
    props.body.version_number_min !== undefined ||
    props.body.version_number_max !== undefined
  ) {
    const versionFilter: Prisma.IntFilter = {};
    if (props.body.version_number_min !== undefined) {
      versionFilter.gte = props.body.version_number_min;
    }
    if (props.body.version_number_max !== undefined) {
      versionFilter.lte = props.body.version_number_max;
    }
    whereInput.version_number = versionFilter;
  }
  // Apply snapshot reason filter
  if (props.body.snapshot_reason !== undefined) {
    whereInput.snapshot_reason = { contains: props.body.snapshot_reason };
  }
  // Apply date range filters
  if (
    props.body.created_at_min !== undefined ||
    props.body.created_at_max !== undefined
  ) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_min !== undefined) {
      dateFilter.gte = new Date(props.body.created_at_min);
    }
    if (props.body.created_at_max !== undefined) {
      dateFilter.lte = new Date(props.body.created_at_max);
    }
    whereInput.created_at = dateFilter;
  }
  // Pagination parameters with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Execute paginated query
  const data =
    await MyGlobal.prisma.discussion_board_comment_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { version_number: "desc" },
      ...DiscussionBoardCommentSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.discussion_board_comment_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
