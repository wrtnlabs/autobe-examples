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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminArticlesArticleIdSnapshots(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Calculate pagination
  const pageNum = props.body.page ?? 1;
  const limitNum = props.body.limit ?? 100;
  const skip = (pageNum - 1) * limitNum;
  // Build WHERE clause with date filtering
  const whereInput = {
    discussion_board_article_id: props.articleId,
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
  } satisfies Prisma.discussion_board_article_snapshotsWhereInput;
  // Fetch snapshots
  const snapshots =
    await MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where: whereInput,
      skip,
      take: limitNum,
      orderBy: { created_at: "desc" as const },
      select: {
        id: true,
        title: true,
        created_at: true,
        discussion_board_section_id: true,
        discussion_board_user_id: true,
      },
    });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_article_snapshots.count({
    where: whereInput,
  });
  // Transform data with separate queries for section and user
  const transformedData = await ArrayUtil.asyncMap(
    snapshots,
    async (snapshot) => {
      // Fetch section data
      const section =
        await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
          where: { id: snapshot.discussion_board_section_id },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            display_order: true,
            deleted_at: true,
          },
        });
      // Fetch user data
      const user =
        await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
          where: { id: snapshot.discussion_board_user_id },
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
          },
        });
      return {
        id: snapshot.id,
        title: snapshot.title,
        section: {
          id: section.id,
          name: section.name,
          description: section.description,
          status: section.status,
          display_order: section.display_order,
          deleted_at: section.deleted_at?.toISOString() ?? null,
        } satisfies IDiscussionBoardSection.ISummary,
        author: {
          id: user.id,
          display_name: user.display_name,
          bio: user.bio,
          created_at: user.created_at.toISOString(),
        } satisfies IDiscussionBoardUser.ISummary,
        created_at: toISOStringSafe(snapshot.created_at),
      } satisfies IDiscussionBoardArticleSnapshot.ISummary;
    },
  );
  // Create the nested pagination structure based on the template
  const innerPagination = {
    current: pageNum,
    limit: limitNum,
    records: total,
    pages: Math.ceil(total / limitNum),
  } satisfies IPage.IPagination;
  const middlePagination1 = {
    pagination: innerPagination,
  } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination;
  const middlePagination2 = {
    pagination: middlePagination1,
  } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination;
  const outerPagination = {
    pagination: middlePagination2,
  } satisfies IPageIDiscussionBoardSection.IPagination;
  return {
    data: transformedData,
    pagination: outerPagination,
  } satisfies IPageIDiscussionBoardArticleSnapshot.ISummary;
}
