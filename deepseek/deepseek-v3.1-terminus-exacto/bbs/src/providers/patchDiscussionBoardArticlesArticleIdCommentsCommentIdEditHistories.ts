import { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdCommentsCommentIdEditHistories(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentEditHistory.IRequest;
}): Promise<IPageIDiscussionBoardCommentEditHistory.ISummary> {
  // Verify comment exists and belongs to article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      article: { id: props.articleId },
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Build WHERE conditions with proper date handling
  const whereInput: Prisma.discussion_board_comment_edit_historiesWhereInput = {
    discussion_board_comment_id: props.commentId,
    ...(props.body.edit_sequence_min !== undefined && {
      edit_sequence: { gte: props.body.edit_sequence_min },
    }),
    ...(props.body.edit_sequence_max !== undefined && {
      edit_sequence: { lte: props.body.edit_sequence_max },
    }),
    ...(props.body.content_search && {
      OR: [
        {
          original_content: {
            contains: props.body.content_search,
            mode: "insensitive",
          },
        },
        {
          edited_content: {
            contains: props.body.content_search,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
  };
  // Pagination parameters with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_edit_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ edit_sequence: "desc" }, { created_at: "desc" }],
    }),
    MyGlobal.prisma.discussion_board_comment_edit_histories.count({
      where: whereInput,
    }),
  ]);
  // Transform to ISummary format
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    edit_sequence: record.edit_sequence,
    edit_reason: record.edit_reason === null ? undefined : record.edit_reason,
    created_at: toISOStringSafe(record.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
