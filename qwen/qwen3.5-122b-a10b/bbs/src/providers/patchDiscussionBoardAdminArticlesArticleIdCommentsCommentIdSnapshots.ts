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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardCommentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdCommentsCommentIdSnapshots(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardCommentSnapshot.ISummary> {
  // Validate comment exists and belongs to specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
    select: { id: true },
  });
  if (comment === null) {
    throw new HttpException(
      "Comment not found or does not belong to the specified article",
      404,
    );
  }
  // Build where clause for snapshots
  const whereInput: Prisma.discussion_board_comment_snapshotsWhereInput = {
    discussion_board_comment_id: props.commentId,
    ...(props.body.from !== undefined && {
      snapshot_created_at: {
        gte: new Date(props.body.from),
      },
    }),
    ...(props.body.to !== undefined && {
      snapshot_created_at: {
        ...(props.body.from !== undefined && {
          gte: new Date(props.body.from),
        }),
        lte: new Date(props.body.to),
      },
    }),
  };
  // Build order by clause
  const orderByInput: Prisma.discussion_board_comment_snapshotsOrderByWithRelationInput =
    props.body.sort === "comment_created_at"
      ? { comment_created_at: props.body.order ?? "desc" }
      : props.body.sort === "comment_updated_at"
        ? { comment_updated_at: props.body.order ?? "desc" }
        : { snapshot_created_at: props.body.order ?? "desc" };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.discussion_board_comment_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardCommentSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.discussion_board_comment_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    DiscussionBoardCommentSnapshotAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardCommentSnapshot.ISummary;
}
