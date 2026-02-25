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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminRecentlyActive(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for published articles only
  const whereInput = {
    status: "published",
    deleted_at: null,
    ...(props.body.discussion_board_section_id !== undefined &&
      props.body.discussion_board_section_id !== null && {
        discussion_board_section_id: props.body.discussion_board_section_id,
      }),
    ...(props.body.discussion_board_user_id !== undefined &&
      props.body.discussion_board_user_id !== null && {
        discussion_board_user_id: props.body.discussion_board_user_id,
      }),
    ...(props.body.title !== undefined &&
      props.body.title !== null && {
        title: { contains: props.body.title },
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null && {
        created_at: { gte: new Date(props.body.created_at_start) },
      }),
    ...(props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null && {
        created_at: { lte: new Date(props.body.created_at_end) },
      }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // First, get IDs of articles sorted by last comment activity
  const articleIds = await MyGlobal.prisma.$queryRaw<
    Array<{
      id: string;
      latest_activity: Date;
    }>
  >`
    SELECT 
      a.id,
      COALESCE(MAX(c.created_at), a.created_at) as latest_activity
    FROM discussion_board_articles a
    LEFT JOIN discussion_board_comments c ON a.id = c.discussion_board_article_id AND c.deleted_at IS NULL
    WHERE a.deleted_at IS NULL AND a.status = 'published'
    GROUP BY a.id, a.created_at
    ORDER BY latest_activity DESC
    LIMIT ${limit} OFFSET ${skip}
  `;
  // Then fetch full article data with relations
  const articles = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: {
      ...whereInput,
      id: { in: articleIds.map((item) => item.id) },
    },
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
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
    },
    orderBy: {
      created_at: "desc", // Fallback ordering
    },
  });
  // Reorder articles according to the activity-based ordering
  const articleMap = new Map(articles.map((article) => [article.id, article]));
  const orderedArticles = articleIds
    .map(({ id }) => articleMap.get(id))
    .filter(
      (article): article is NonNullable<typeof article> =>
        article !== undefined,
    );
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform data to response format
  const transformedData = orderedArticles.map((article) => ({
    id: article.id,
    title: article.title,
    status: article.status,
    created_at: toISOStringSafe(article.created_at),
    author: {
      id: article.author.id,
      display_name: article.author.display_name,
      bio: article.author.bio,
      created_at: toISOStringSafe(article.author.created_at),
    } satisfies IDiscussionBoardUser.ISummary,
    section: {
      id: article.section.id,
      name: article.section.name,
      description: article.section.description,
      status: article.section.status,
      display_order: article.section.display_order,
      deleted_at: article.section.deleted_at
        ? toISOStringSafe(article.section.deleted_at)
        : null,
    } satisfies IDiscussionBoardSection.ISummary,
  }));
  // Build the correct pagination structure
  const basePagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total satisfies number as number,
    pages: Math.ceil(total / limit) satisfies number as number,
  } satisfies IPage.IPagination;
  // Create nested pagination structure according to DTO definitions
  const adminDistStatPagination = {
    pagination: basePagination,
    data: [] as IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
  } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination;
  const adminPromotionPagination = {
    pagination: adminDistStatPagination,
    data: [] as IDiscussionBoardAdministratorPromotionRequest.IPagination[],
  } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination;
  const sectionPagination = {
    pagination: adminPromotionPagination,
    data: [] as IDiscussionBoardSection.IPagination[],
  } satisfies IPageIDiscussionBoardSection.IPagination;
  return {
    pagination: sectionPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
