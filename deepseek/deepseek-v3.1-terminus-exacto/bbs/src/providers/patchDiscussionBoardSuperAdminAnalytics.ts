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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardArticleViewStatAtSummaryTransformer } from "../transformers/DiscussionBoardArticleViewStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAnalytics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardArticleViewStat.IRequest;
}): Promise<IPageIDiscussionBoardArticleViewStat.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.discussion_board_article_view_statsWhereInput = {
    deleted_at: null,
    ...(props.body.viewed_at_from && {
      viewed_at: { gte: new Date(props.body.viewed_at_from) },
    }),
    ...(props.body.viewed_at_to && {
      viewed_at: { lte: new Date(props.body.viewed_at_to) },
    }),
    ...(props.body.discussion_board_article_id && {
      discussion_board_article_id: props.body.discussion_board_article_id,
    }),
  };
  // Apply viewer_type filter
  switch (props.body.viewer_type) {
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
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_article_view_stats.count(
    {
      where: whereInput,
    },
  );
  // Query data with pagination
  const data =
    await MyGlobal.prisma.discussion_board_article_view_stats.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { viewed_at: "desc" as const },
      ...DiscussionBoardArticleViewStatAtSummaryTransformer.select(),
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleViewStatAtSummaryTransformer.transform,
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
