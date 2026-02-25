import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStatEvent";
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

export async function patchDiscussionBoardSuperAdminAnalyticsArticleViews(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardArticleViewStatEvent.IRequest;
}): Promise<IPageIDiscussionBoardArticleViewStatEvent.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date filtering
  const whereInput = {
    ...(props.body.start_date && {
      OR: [
        { last_viewed_at: { gte: new Date(props.body.start_date) } },
        { created_at: { gte: new Date(props.body.start_date) } },
      ],
    }),
    ...(props.body.end_date && {
      OR: [
        { last_viewed_at: { lte: new Date(props.body.end_date) } },
        { created_at: { lte: new Date(props.body.end_date) } },
      ],
    }),
    ...(props.body.section_id && {
      article: {
        discussion_board_section_id: props.body.section_id,
      },
    }),
  } satisfies Prisma.discussion_board_article_view_statsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_view_stats.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { last_viewed_at: "desc" },
      include: {
        article: {
          include: {
            author: true,
            section: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_article_view_stats.count({
      where: whereInput,
    }),
  ]);
  // Transform data to match the expected response structure
  const transformedData = data.map(
    (stat) =>
      ({
        id: stat.id satisfies string & tags.Format<"uuid">,
        total_view_count: stat.total_view_count satisfies number &
          tags.Type<"int32">,
        unique_viewer_count: stat.unique_viewer_count satisfies number &
          tags.Type<"int32">,
        last_viewed_at:
          stat.last_viewed_at?.toISOString() ??
          (null satisfies (string & tags.Format<"date-time">) | null),
        average_time_spent_seconds: stat.average_time_spent_seconds satisfies
          | number
          | null,
        article: {
          id: stat.article.id satisfies string & tags.Format<"uuid">,
          title: stat.article.title satisfies string,
          status: stat.article.status satisfies string,
          created_at: stat.article.created_at.toISOString() satisfies string &
            tags.Format<"date-time">,
          author: {
            id: stat.article.author.id satisfies string & tags.Format<"uuid">,
            display_name: stat.article.author.display_name satisfies string,
            bio: stat.article.author.bio ?? (null satisfies string | null),
            created_at:
              stat.article.author.created_at.toISOString() satisfies string &
                tags.Format<"date-time">,
          } satisfies IDiscussionBoardUser.ISummary,
          section: {
            id: stat.article.section.id satisfies string & tags.Format<"uuid">,
            name: stat.article.section.name satisfies string,
            description: stat.article.section.description satisfies string,
            status: stat.article.section.status satisfies string,
            display_order: stat.article.section.display_order satisfies number &
              tags.Type<"int32">,
            deleted_at:
              stat.article.section.deleted_at?.toISOString() ??
              (null satisfies
                | (string & tags.Format<"date-time">)
                | null
                | undefined),
          } satisfies IDiscussionBoardSection.ISummary,
        } satisfies IDiscussionBoardArticle.ISummary,
      }) satisfies IDiscussionBoardArticleViewStatEvent.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      page: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticleViewStatEvent.ISummary;
}
