import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegisteredmemberPayload } from "../decorators/payload/RegisteredmemberPayload";

export async function patchUsersUserIdArticles(props: {
  registeredMember: RegisteredmemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconPoliticalDiscussionArticle.IRequest;
}): Promise<IPageIEconPoliticalDiscussionArticle.ISummary> {
  const { registeredMember, userId, body } = props;

  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 20, 50);
  const skip = (page - 1) * limit;

  // Build dynamic where conditions
  const whereConditions: Prisma.econ_political_discussion_articlesWhereInput = {
    // Only return articles by the specified user
    author: {
      id: userId,
    },
    // Only active articles (not deleted)
    deleted_at: null,
  };

  // Apply search filter if provided
  if (body.search) {
    whereConditions.OR = [
      { title: { contains: body.search, mode: "insensitive" } },
      { content: { contains: body.search, mode: "insensitive" } },
    ];
  }

  // Apply category filter if provided
  if (body.category) {
    whereConditions.category = body.category;
  }

  // Apply status filter if provided
  if (body.status) {
    whereConditions.status = body.status;
  }

  // Determine sorting
  const orderBy: Prisma.econ_political_discussion_articlesOrderByWithRelationInput =
    {};
  const sortField = body.order_by ?? "created_at";
  const sortDirection = body.order_direction ?? "desc";

  orderBy[sortField] = sortDirection;

  // Execute queries in parallel for efficiency
  const [data, total] = await Promise.all([
    MyGlobal.prisma.econ_political_discussion_articles.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.econ_political_discussion_articles.count({
      where: whereConditions,
    }),
  ]);

  // Transform data to match ISummary interface
  const transformedData: IEconPoliticalDiscussionArticle.ISummary[] = data.map(
    (article) => ({
      id: article.id,
      title: article.title,
      category: article.category,
      status: article.status,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
    }),
  );

  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
