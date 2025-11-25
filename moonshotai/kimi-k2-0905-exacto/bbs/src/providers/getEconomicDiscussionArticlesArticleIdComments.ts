import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionComment";
import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";

export async function getEconomicDiscussionArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  page?: number;
  limit?: number;
}): Promise<IPageIEconomicDiscussionComment.ISummary> {
  // Validate article exists
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: {
        id: props.articleId,
        deleted_at: null,
      },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Pagination parameters with defaults
  const page = props.page ?? 1;
  const limit = Math.min(props.limit ?? 20, 100); // Cap at 100 items per page
  const skip = (page - 1) * limit;

  // Query comments for the specified article with member information
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_comments.findMany({
      where: {
        economic_discussion_article_id: props.articleId,
        deleted_at: null,
        status: "approved",
      },
      include: {
        member: true,
      },
      orderBy: {
        created_at: "asc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.economic_discussion_comments.count({
      where: {
        economic_discussion_article_id: props.articleId,
        deleted_at: null,
        status: "approved",
      },
    }),
  ]);

  // Transform data to match API interface
  const transformedData: IEconomicDiscussionComment.ISummary[] = data.map(
    (comment) => ({
      id: comment.id,
      economic_discussion_article_id: comment.economic_discussion_article_id,
      economic_discussion_member_id: comment.economic_discussion_member_id,
      content: comment.content,
      status: comment.status as "pending" | "approved" | "rejected",
      created_at: toISOStringSafe(comment.created_at),
      is_reply: comment.parent_id !== null,
    }),
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    data: transformedData,
    pagination: {
      current: typia.assert<string & tags.Format<"uuid">>(String(page)),
      limit: typia.assert<string & tags.Format<"uuid">>(String(limit)),
      records: typia.assert<string & tags.Format<"uuid">>(String(total)),
      pages: typia.assert<string & tags.Format<"uuid">>(String(totalPages)),
    },
  };
}
