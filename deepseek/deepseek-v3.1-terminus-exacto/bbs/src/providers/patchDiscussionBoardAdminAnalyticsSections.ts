import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionStatistic";
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

export async function patchDiscussionBoardAdminAnalyticsSections(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSectionStatistic.IRequest;
}): Promise<IPageIDiscussionBoardSectionStatistic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions using proper schema field names
  const whereInput = {
    section: {
      deleted_at: null,
    },
    ...(props.body.start_date && {
      last_activity_at: {
        gte: props.body.start_date,
      },
    }),
    ...(props.body.end_date && {
      last_activity_at: {
        lte: props.body.end_date,
      },
    }),
    ...(props.body.min_view_count !== undefined && {
      view_count: {
        gte: props.body.min_view_count,
      },
    }),
    ...(props.body.max_view_count !== undefined && {
      view_count: {
        lte: props.body.max_view_count,
      },
    }),
    ...(props.body.min_article_count !== undefined && {
      article_count: {
        gte: props.body.min_article_count,
      },
    }),
    ...(props.body.max_article_count !== undefined && {
      article_count: {
        lte: props.body.max_article_count,
      },
    }),
    ...(props.body.min_comment_count !== undefined && {
      comment_count: {
        gte: props.body.min_comment_count,
      },
    }),
    ...(props.body.max_comment_count !== undefined && {
      comment_count: {
        lte: props.body.max_comment_count,
      },
    }),
  } satisfies Prisma.discussion_board_section_statisticsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_section_statistics.findMany({
      where: whereInput,
      include: {
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
      skip,
      take: limit,
      orderBy: { last_activity_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_section_statistics.count({
      where: whereInput,
    }),
  ]);
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: data.map((stat) => ({
      id: stat.id,
      view_count: stat.view_count,
      article_count: stat.article_count,
      comment_count: stat.comment_count,
      last_activity_at: toISOStringSafe(stat.last_activity_at),
      section: {
        id: stat.section.id,
        name: stat.section.name,
        description: stat.section.description,
        status: stat.section.status,
        display_order: stat.section.display_order,
        deleted_at: stat.section.deleted_at
          ? toISOStringSafe(stat.section.deleted_at)
          : null,
      } satisfies IDiscussionBoardSection.ISummary,
    })),
  };
}
