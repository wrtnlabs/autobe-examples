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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminRecentlyActive(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    status: "published",
    ...(props.body.id && { id: props.body.id }),
    ...(props.body.title && { title: { contains: props.body.title } }),
    ...(props.body.content && { content: { contains: props.body.content } }),
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
    ...(props.body.discussion_board_user_id && {
      discussion_board_user_id: props.body.discussion_board_user_id,
    }),
    ...(props.body.created_at_start && {
      created_at: {
        gte: props.body.created_at_start,
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: props.body.created_at_end,
      },
    }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // First get articles with comments using a subquery approach
  const articlesWithComments = await MyGlobal.prisma.$queryRaw<
    Array<{
      id: string;
      last_activity: string;
    }>
  >`
    SELECT 
      a.id,
      COALESCE(
        MAX(c.created_at),
        a.created_at
      ) as last_activity
    FROM discussion_board_articles a
    LEFT JOIN discussion_board_comments c ON c.discussion_board_article_id = a.id
    WHERE a.deleted_at IS NULL
      AND a.status = 'published'
    GROUP BY a.id
    ORDER BY last_activity DESC
    LIMIT ${limit} OFFSET ${skip}
  `;
  const articleIds = articlesWithComments.map((item) => item.id);
  if (articleIds.length === 0) {
    return {
      pagination: {
        pagination:
          typia.random<IPageIDiscussionBoardAdministratorPromotionRequest.IPagination>(),
        data: [],
      } satisfies IPageIDiscussionBoardSection.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardArticle.ISummary;
  }
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: {
      ...whereInput,
      id: { in: articleIds },
    },
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Order the data according to articleIds order
  const orderedData = articleIds
    .map((id) => data.find((article) => article.id === id))
    .filter(
      (article): article is NonNullable<typeof article> =>
        article !== undefined,
    );
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  const pageCurrent = page satisfies number as number;
  const pageLimit = limit satisfies number as number;
  const pageRecords = total satisfies number as number;
  const pagePages = Math.ceil(total / limit) satisfies number as number;
  return {
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: typia.assert<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(pageCurrent),
            limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
              pageLimit,
            ),
            records: typia.assert<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(pageRecords),
            pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
              pagePages,
            ),
          } satisfies IPage.IPagination,
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [] satisfies IDiscussionBoardSection.IPagination[],
    } satisfies IPageIDiscussionBoardSection.IPagination,
    data: await ArrayUtil.asyncMap(
      orderedData,
      DiscussionBoardArticleAtSummaryTransformer.transform,
    ),
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
