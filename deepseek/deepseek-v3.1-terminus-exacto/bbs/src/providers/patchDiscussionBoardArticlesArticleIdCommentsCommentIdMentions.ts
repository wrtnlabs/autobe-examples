import { IDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMention";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentMention";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentMentionAtSummaryTransformer } from "../transformers/DiscussionBoardCommentMentionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdCommentsCommentIdMentions(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentMention.IRequest;
}): Promise<IPageIDiscussionBoardCommentMention.ISummary> {
  // Verify comment exists and belongs to the article
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
      400,
    );
  }
  // Build WHERE conditions
  const whereInput = {
    discussion_board_comment_id: props.commentId,
    ...(props.body.mentioned_user_ids &&
      props.body.mentioned_user_ids.length > 0 && {
        discussion_board_user_id: { in: props.body.mentioned_user_ids },
      }),
    ...(props.body.position_start !== undefined && {
      position_start: { gte: props.body.position_start },
    }),
    ...(props.body.position_end !== undefined && {
      position_end: { lte: props.body.position_end },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
  } satisfies Prisma.discussion_board_comment_mentionsWhereInput;
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting setup
  const orderByInput = (
    props.body.sort_by === "position_start"
      ? {
          position_start:
            props.body.sort_order === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
      : {
          created_at:
            props.body.sort_order === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
  ) satisfies Prisma.discussion_board_comment_mentionsOrderByWithRelationInput;
  // Execute queries in parallel for better performance
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_mentions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardCommentMentionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_comment_mentions.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentMentionAtSummaryTransformer.transform,
  );
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
