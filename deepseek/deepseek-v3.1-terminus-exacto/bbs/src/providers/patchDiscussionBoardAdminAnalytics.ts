import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStat";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleViewStatAtSummaryTransformer } from "../transformers/DiscussionBoardArticleViewStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAnalytics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticleViewStat.IRequest;
}): Promise<IPageIDiscussionBoardArticleViewStat.ISummary> {
  // Extract query parameters
  const {
    viewed_at_from,
    viewed_at_to,
    discussion_board_article_id,
    viewer_type,
    page = 1,
    limit = 100,
  } = props.body;
  // Build WHERE clause incrementally
  const whereInput: Prisma.discussion_board_article_view_statsWhereInput = {
    deleted_at: null,
  };
  // Apply date range filtering - convert ISO strings to Date for Prisma
  if (viewed_at_from !== undefined && viewed_at_to !== undefined) {
    // Ensure date range is logical
    const fromDate = new Date(viewed_at_from);
    const toDate = new Date(viewed_at_to);
    if (fromDate > toDate) {
      throw new HttpException(
        "viewed_at_from must be before viewed_at_to",
        400,
      );
    }
    whereInput.viewed_at = {
      gte: fromDate,
      lte: toDate,
    };
  } else {
    // Handle single date filters
    if (viewed_at_from !== undefined) {
      whereInput.viewed_at = {
        gte: new Date(viewed_at_from),
      };
    }
    if (viewed_at_to !== undefined) {
      // Fix: Properly handle the case where whereInput.viewed_at might be undefined
      // Instead of accessing properties, reconstruct based on current state
      if (
        whereInput.viewed_at &&
        typeof whereInput.viewed_at === "object" &&
        "gte" in whereInput.viewed_at
      ) {
        whereInput.viewed_at = {
          gte: whereInput.viewed_at.gte,
          lte: new Date(viewed_at_to),
        };
      } else {
        whereInput.viewed_at = {
          lte: new Date(viewed_at_to),
        };
      }
    }
  }
  // Apply article filter if specified
  if (discussion_board_article_id !== undefined) {
    whereInput.discussion_board_article_id = discussion_board_article_id;
  }
  // Apply viewer type filter based on presence of corresponding actor ID
  if (viewer_type !== undefined) {
    switch (viewer_type) {
      case "member":
        whereInput.discussion_board_member_id = { not: null };
        break;
      case "admin":
        whereInput.discussion_board_admin_id = { not: null };
        break;
      case "super_admin":
        whereInput.discussion_board_super_admin_id = { not: null };
        break;
      case "guest":
        whereInput.discussion_board_guest_id = { not: null };
        break;
    }
  }
  // Calculate pagination
  const currentPage = page;
  const perPage = limit;
  const skip = (currentPage - 1) * perPage;
  // Execute sequential queries as per specification
  const data =
    await MyGlobal.prisma.discussion_board_article_view_stats.findMany({
      where: whereInput,
      ...DiscussionBoardArticleViewStatAtSummaryTransformer.select(),
      orderBy: { viewed_at: "desc" as const },
      skip,
      take: perPage,
    });
  const total = await MyGlobal.prisma.discussion_board_article_view_stats.count(
    {
      where: whereInput,
    },
  );
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleViewStatAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: currentPage,
      limit: perPage,
      records: total,
      pages: total > 0 ? Math.ceil(total / perPage) : 0,
    } satisfies IPage.IPagination,
  };
}
