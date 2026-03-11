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
  // Verify the comment exists and belongs to the article
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    discussion_board_comment_id: props.commentId,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.edit_reason && {
      edit_reason: props.body.edit_reason,
    }),
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
  } satisfies Prisma.discussion_board_comment_snapshotsWhereInput;
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.discussion_board_comment_snapshotsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...DiscussionBoardCommentSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_comment_snapshots.count({
      where: whereInput,
    }),
  ]);
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
