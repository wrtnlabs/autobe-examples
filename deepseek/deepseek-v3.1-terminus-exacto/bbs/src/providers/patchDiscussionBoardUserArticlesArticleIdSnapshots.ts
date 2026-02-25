import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardArticleSnapshotAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "../transformers/DiscussionBoardUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardUserArticlesArticleIdSnapshots(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  // Verify the article exists and user has permission
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      status: "published",
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE condition
  const whereInput = {
    discussion_board_article_id: props.articleId,
    ...(props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: {
          gte: new Date(props.body.created_at_start),
          lte: new Date(props.body.created_at_end),
        },
      }),
    ...(props.body.created_at_start &&
      !props.body.created_at_end && {
        created_at: { gte: new Date(props.body.created_at_start) },
      }),
    ...(!props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: { lte: new Date(props.body.created_at_end) },
      }),
  } satisfies Prisma.discussion_board_article_snapshotsWhereInput;
  // Query data with transformer select
  const data =
    await MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardArticleSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total = await MyGlobal.prisma.discussion_board_article_snapshots.count({
    where: whereInput,
  });
  // Transform data using the transformer
  const transformedData = await Promise.all(
    data.map(async (snapshot) => {
      // Fetch section data with required relations for transformer
      const sectionData =
        await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
          where: { id: snapshot.discussion_board_section_id },
          ...DiscussionBoardSectionAtSummaryTransformer.select(),
        });
      // Fetch user data
      const userData =
        await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
          where: { id: snapshot.discussion_board_user_id },
          ...DiscussionBoardUserAtSummaryTransformer.select(),
        });
      // Transform section and user
      const section =
        await DiscussionBoardSectionAtSummaryTransformer.transform(sectionData);
      const author =
        await DiscussionBoardUserAtSummaryTransformer.transform(userData);
      return {
        id: snapshot.id,
        title: snapshot.title,
        section,
        author,
        created_at: toISOStringSafe(snapshot.created_at),
      } satisfies IDiscussionBoardArticleSnapshot.ISummary;
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
