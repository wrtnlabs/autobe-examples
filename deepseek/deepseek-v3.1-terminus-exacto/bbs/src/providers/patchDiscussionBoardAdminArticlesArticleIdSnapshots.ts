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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdSnapshots(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build date range filter
  const whereInput: Prisma.discussion_board_article_snapshotsWhereInput = {
    discussion_board_article_id: props.articleId,
  };
  if (props.body.created_at_start || props.body.created_at_end) {
    whereInput.created_at = {};
    if (props.body.created_at_start) {
      whereInput.created_at.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end) {
      whereInput.created_at.lte = props.body.created_at_end;
    }
  }
  // Query snapshots with correct relation field names
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        created_at: true,
        discussion_board_section_id: true,
        discussion_board_user_id: true,
      },
    }),
    MyGlobal.prisma.discussion_board_article_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Fetch related data separately
  const sectionIds = [
    ...new Set(data.map((snapshot) => snapshot.discussion_board_section_id)),
  ];
  const userIds = [
    ...new Set(data.map((snapshot) => snapshot.discussion_board_user_id)),
  ];
  const [sections, users] = await Promise.all([
    MyGlobal.prisma.discussion_board_sections.findMany({
      where: { id: { in: sectionIds } },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        display_order: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_users.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
      },
    }),
  ]);
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const userMap = new Map(users.map((user) => [user.id, user]));
  // Transform to DTO format
  const snapshotSummaries: IDiscussionBoardArticleSnapshot.ISummary[] =
    data.map((snapshot) => {
      const section = sectionMap.get(snapshot.discussion_board_section_id);
      const user = userMap.get(snapshot.discussion_board_user_id);
      return {
        id: snapshot.id,
        title: snapshot.title,
        section: section
          ? ({
              id: section.id,
              name: section.name,
              description: section.description,
              status: section.status,
              display_order: section.display_order,
              deleted_at: section.deleted_at
                ? toISOStringSafe(section.deleted_at)
                : null,
            } satisfies IDiscussionBoardSection.ISummary)
          : ({
              id: snapshot.discussion_board_section_id,
              name: "Unknown Section",
              description: "",
              status: "active",
              display_order: 0,
              deleted_at: null,
            } satisfies IDiscussionBoardSection.ISummary),
        author: user
          ? ({
              id: user.id,
              display_name: user.display_name,
              bio: user.bio ?? null,
              created_at: toISOStringSafe(user.created_at),
            } satisfies IDiscussionBoardUser.ISummary)
          : ({
              id: snapshot.discussion_board_user_id,
              display_name: "Unknown User",
              bio: null,
              created_at: toISOStringSafe(new Date()),
            } satisfies IDiscussionBoardUser.ISummary),
        created_at: toISOStringSafe(snapshot.created_at),
      };
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: snapshotSummaries,
  } satisfies IPageIDiscussionBoardArticleSnapshot.ISummary;
}
