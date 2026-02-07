import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardArticleSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdSnapshots(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  // Verify article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Validate search parameter if provided
  const searchQuery = props.body.search?.trim();
  if (searchQuery !== undefined && searchQuery.length === 0) {
    throw new HttpException("Search query cannot be empty", 400);
  }
  // Build WHERE clause
  const whereInput = {
    discussion_board_article_id: props.articleId,
    AND: [
      // Search filter using ILIKE for case-insensitive partial matching
      ...(searchQuery
        ? [
            {
              OR: [
                {
                  title: {
                    contains: searchQuery,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  content: {
                    contains: searchQuery,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            },
          ]
        : []),
      // Date range filter using string comparison without Date objects
      ...(props.body.created_at_start || props.body.created_at_end
        ? [
            {
              created_at: {
                ...(props.body.created_at_start
                  ? { gte: props.body.created_at_start }
                  : {}),
                ...(props.body.created_at_end
                  ? { lte: props.body.created_at_end }
                  : {}),
              },
            },
          ]
        : []),
    ],
  } satisfies Prisma.discussion_board_article_snapshotsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute queries sequentially (not parallel) to avoid transaction conflicts
  const data =
    await MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardArticleSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.discussion_board_article_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
