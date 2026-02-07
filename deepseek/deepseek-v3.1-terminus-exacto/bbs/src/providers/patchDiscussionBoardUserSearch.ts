import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserSearch(props: {
  user: UserPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereConditions: Prisma.discussion_board_articlesWhereInput = {
    status: "published",
    deleted_at: null,
  };
  // Handle search using OR conditions for title and content
  if (props.body.search && props.body.search.trim().length > 0) {
    whereConditions.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Add section filter
  if (props.body.section_id) {
    whereConditions.discussion_board_section_id = props.body.section_id;
  }
  // Add author filter
  if (props.body.author_id) {
    whereConditions.discussion_board_user_id = props.body.author_id;
  }
  // Add status filter (overriding default published status if specified)
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }
  // Handle date range filters with proper ISO string handling
  if (props.body.created_after || props.body.created_before) {
    whereConditions.created_at = {};
    if (props.body.created_after) {
      whereConditions.created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      whereConditions.created_at.lte = props.body.created_before;
    }
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
            updated_at: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            status: true,
            display_order: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: whereConditions,
    }),
  ]);
  // Transform database results to DTO format
  const transformedData: IDiscussionBoardArticle.ISummary[] = data.map(
    (article) => ({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      status: article.status,
      created_at: toISOStringSafe(article.created_at),
      author: {
        id: article.author.id as string & tags.Format<"uuid">,
        display_name: article.author.display_name,
        bio: article.author.bio,
        created_at: toISOStringSafe(article.author.created_at),
        updated_at: toISOStringSafe(article.author.updated_at),
      } satisfies IDiscussionBoardUser.ISummary,
      section: {
        id: article.section.id as string & tags.Format<"uuid">,
        name: article.section.name,
        status: article.section.status as "active" | "inactive" | "archived",
        display_order: article.section.display_order,
      } satisfies IDiscussionBoardSection.ISummary,
    }),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
