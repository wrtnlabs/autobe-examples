import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.discussion_board_commentsWhereInput = {
    discussion_board_article_id: props.articleId,
    deleted_at: null,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
      },
    }),
    ...(props.body.author_id && {
      discussion_board_member_id: props.body.author_id,
    }),
    ...(props.body.created_after && {
      created_at: {
        gte: new Date(props.body.created_after),
      },
    }),
    ...(props.body.created_before && {
      created_at: {
        lte: new Date(props.body.created_before),
      },
    }),
    ...(props.body.updated_after && {
      updated_at: {
        gte: new Date(props.body.updated_after),
      },
    }),
    ...(props.body.updated_before && {
      updated_at: {
        lte: new Date(props.body.updated_before),
      },
    }),
  } satisfies Prisma.discussion_board_commentsWhereInput;
  // Query comments with pagination
  const comments = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      member: {
        select: {
          id: true,
          display_name: true,
          ban_status: true,
          created_at: true,
        },
      },
    },
  });
  // Count total matching comments
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where: whereInput,
  });
  // Transform results to DTO format
  const data = await ArrayUtil.asyncMap(comments, async (comment) => {
    return {
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.member.id,
        display_name: comment.member.display_name,
        ban_status: comment.member.ban_status,
        created_at: toISOStringSafe(comment.member.created_at),
      } satisfies IDiscussionBoardMember.ISummary,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      deleted_at: comment.deleted_at
        ? toISOStringSafe(comment.deleted_at)
        : null,
    } satisfies IDiscussionBoardComment.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  } satisfies IPageIDiscussionBoardComment.ISummary;
}
