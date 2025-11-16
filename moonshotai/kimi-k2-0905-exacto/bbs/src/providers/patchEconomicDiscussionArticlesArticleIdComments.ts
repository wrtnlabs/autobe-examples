import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IPageIEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";

export async function patchEconomicDiscussionArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionComment.IRequest;
}): Promise<IPageIEconomicDiscussionComment.ISummary> {
  // Verify article exists
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Set defaults for pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortDirection = props.body.order ?? "desc";

  // Build where conditions
  const whereConditions: Prisma.economic_discussion_commentsWhereInput = {
    economic_discussion_article_id: props.articleId,
    deleted_at: null, // Exclude soft-deleted comments
  };

  // Apply status filter if specified
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Apply search filter if specified
  if (props.body.search) {
    whereConditions.content = {
      contains: props.body.search,
      mode: "insensitive" as Prisma.QueryMode,
    };
  }

  // Apply parent filter if specified
  if (props.body.parent_id !== undefined) {
    whereConditions.parent_id = props.body.parent_id;
  }

  // Apply member filter if specified - convert null to undefined
  if (props.body.member_id !== undefined) {
    whereConditions.economic_discussion_member_id =
      props.body.member_id !== null ? props.body.member_id : undefined;
  }

  // Apply date range filters
  if (props.body.created_after || props.body.created_before) {
    whereConditions.created_at = {};
    if (props.body.created_after) {
      whereConditions.created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      whereConditions.created_at.lte = props.body.created_before;
    }
  }

  // Execute queries in parallel for better performance
  const [comments, totalCount] = await Promise.all([
    MyGlobal.prisma.economic_discussion_comments.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: {
        created_at: sortDirection,
      },
      include: {
        member: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    }),
    MyGlobal.prisma.economic_discussion_comments.count({
      where: whereConditions,
    }),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  // Transform results
  const data: IEconomicDiscussionComment.ISummary[] = comments.map(
    (comment) => ({
      id: comment.id as string & tags.Format<"uuid">,
      economic_discussion_article_id:
        comment.economic_discussion_article_id as string & tags.Format<"uuid">,
      economic_discussion_member_id:
        comment.economic_discussion_member_id as string & tags.Format<"uuid">,
      content: comment.content.substring(0, 200) as string &
        tags.MaxLength<200>,
      status: comment.status as "pending" | "approved" | "rejected",
      created_at: toISOStringSafe(comment.created_at),
      is_reply: comment.parent_id !== null,
    }),
  );

  return {
    data,
    pagination: {
      current: typia.assert<ICrIPageIntegerRequired>(String(page)),
      limit: typia.assert<ICrIPageIntegerRequired>(String(limit)),
      records: typia.assert<ICrIPageIntegerRequired>(String(totalCount)),
      pages: typia.assert<ICrIPageIntegerRequired>(String(totalPages)),
    },
  };
}
