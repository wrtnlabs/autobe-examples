import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
  // Verify comment exists and belongs to the specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
    select: {
      id: true,
    },
  });
  if (comment === null) {
    throw new HttpException(
      "Comment not found or does not belong to the specified article",
      404,
    );
  }
  // Build where clause with optional date range filters
  const whereInput: Prisma.discussion_board_comment_snapshotsWhereInput = {
    discussion_board_comment_id: props.commentId,
    ...(props.body.snapshot_created_at_from && {
      snapshot_created_at: {
        gte: new Date(props.body.snapshot_created_at_from),
      },
    }),
    ...(props.body.snapshot_created_at_to && {
      snapshot_created_at: {
        lte: new Date(props.body.snapshot_created_at_to),
      },
    }),
  };
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get paginated snapshots using transformer select
  const snapshots =
    await MyGlobal.prisma.discussion_board_comment_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        snapshot_created_at: "desc",
      },
      ...DiscussionBoardCommentSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_comment_snapshots.count({
    where: whereInput,
  });
  // Transform each snapshot individually using ArrayUtil.asyncMap
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      DiscussionBoardCommentSnapshotAtSummaryTransformer.transform,
    ),
  };
}
