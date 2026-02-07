import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdComments(props: {
  admin: AdminPayload;
  articleId: string;
  body: IDiscussionBoardArticleComment.IRequest;
}): Promise<IPageIDiscussionBoardArticleComment.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Get article to verify existence
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);
  // Build where clause
  const whereInput: Prisma.discussion_board_commentsWhereInput = {
    discussion_board_article_id: props.articleId,
    deleted_at: null, // Admin can see active comments
  };
  // Get comments data with author info
  const data = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      author: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where: whereInput,
  });
  // Map to response format - match DTO structure exactly
  const response: IPageIDiscussionBoardArticleComment.ISummary = {
    data: data.map((comment) => ({
      id: comment.id as string & tags.Format<"uuid">,
      content: comment.content,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      author: {
        id: comment.author.id as string & tags.Format<"uuid">,
        display_name: comment.author.display_name,
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
  return response;
}
