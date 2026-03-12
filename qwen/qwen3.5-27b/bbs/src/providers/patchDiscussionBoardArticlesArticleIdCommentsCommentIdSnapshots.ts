import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
  // Validate that the comment belongs to the specified article
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
      404,
    );
  }
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  // Build WHERE clause
  const whereInput = {
    discussion_board_comment_id: props.commentId,
    discussion_board_article_id: props.articleId,
    ...(props.body.snapshot_at_from && {
      snapshot_at: {
        gte: new Date(props.body.snapshot_at_from),
      },
    }),
    ...(props.body.snapshot_at_to && {
      snapshot_at: {
        lte: new Date(props.body.snapshot_at_to),
      },
    }),
  } satisfies Prisma.discussion_board_comment_snapshotsWhereInput;
  // Build ORDER BY clause
  const sortBy = props.body.sortBy ?? "snapshot_at";
  const sortOrder = props.body.sortOrder ?? "asc";
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.discussion_board_comment_snapshotsOrderByWithRelationInput;
  // Fetch snapshots with pagination
  const data =
    await MyGlobal.prisma.discussion_board_comment_snapshots.findMany({
      where: whereInput,
      skip,
      take: pageSize,
      orderBy: orderByInput,
      ...DiscussionBoardCommentSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.discussion_board_comment_snapshots.count({
    where: whereInput,
  });
  // Transform snapshots
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
