import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function patchDiscussionBoardUserArticlesSearchTags(props: {
  user: UserPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const pageNum = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (pageNum - 1) * limit;
  // Build comprehensive where clause
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    status: "published",
  };
  // Add basic filters
  if (props.body.id) {
    whereInput.id = props.body.id;
  }
  if (props.body.title) {
    whereInput.title = { contains: props.body.title };
  }
  if (props.body.content) {
    whereInput.content = { contains: props.body.content };
  }
  if (props.body.discussion_board_section_id) {
    whereInput.discussion_board_section_id =
      props.body.discussion_board_section_id;
  }
  if (props.body.discussion_board_user_id) {
    whereInput.discussion_board_user_id = props.body.discussion_board_user_id;
  }
  // Add date range filtering
  if (props.body.created_at_start || props.body.created_at_end) {
    whereInput.created_at = {};
    if (props.body.created_at_start) {
      whereInput.created_at.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end) {
      whereInput.created_at.lte = new Date(props.body.created_at_end);
    }
  }
  // Add status filter if provided
  if (props.body.status) {
    whereInput.status = props.body.status;
  }
  // Tag filtering - articles must have at least one matching tag
  if (props.body.title || props.body.content) {
    // For tag-based search, we need to filter articles that have matching tags
    whereInput.tags = {
      some: {
        deleted_at: null,
        tag_name: {
          contains: (props.body.title || props.body.content) ?? "",
        },
      },
    };
  }
  const [articles, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: whereInput,
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
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            display_order: true,
            deleted_at: true,
          },
        },
        tags: {
          where: { deleted_at: null },
          select: {
            tag_name: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: whereInput,
    }),
  ]);
  // Transform results to match DTO structure
  const data = articles.map((article) => ({
    id: article.id as string & tags.Format<"uuid">,
    title: article.title,
    status: article.status,
    created_at: toISOStringSafe(article.created_at) as string &
      tags.Format<"date-time">,
    author: {
      id: article.author.id as string & tags.Format<"uuid">,
      display_name: article.author.display_name,
      bio: article.author.bio ?? null,
      created_at: toISOStringSafe(article.author.created_at) as string &
        tags.Format<"date-time">,
    } satisfies IDiscussionBoardUser.ISummary,
    section: {
      id: article.section.id as string & tags.Format<"uuid">,
      name: article.section.name,
      description: article.section.description,
      status: article.section.status,
      display_order: article.section.display_order,
      deleted_at: article.section.deleted_at
        ? (toISOStringSafe(article.section.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    } satisfies IDiscussionBoardSection.ISummary,
  }));
  // Create the correct nested pagination structure
  const pagination = {
    pagination: {
      pagination: {
        pagination: {
          current: pageNum,
          limit: limit,
          records: total,
          pages: Math.ceil(total / limit),
        } satisfies IPage.IPagination,
        data: [] satisfies IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
      } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      data: [] satisfies IDiscussionBoardAdministratorPromotionRequest.IPagination[],
    } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
    data: [] satisfies IDiscussionBoardSection.IPagination[],
  } satisfies IPageIDiscussionBoardSection.IPagination;
  return {
    pagination: pagination,
    data: data,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
