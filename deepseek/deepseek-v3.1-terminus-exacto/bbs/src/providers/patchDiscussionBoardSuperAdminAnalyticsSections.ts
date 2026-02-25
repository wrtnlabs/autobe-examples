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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionStatisticAtSummaryTransformer } from "../transformers/DiscussionBoardSectionStatisticAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAnalyticsSections(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSectionStatistic.IRequest;
}): Promise<IPageIDiscussionBoardSectionStatistic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions for filtering - date strings are compatible with Prisma's DateTime type
  const dateFilterInput: {
    gte?: string;
    lte?: string;
  } = {};
  if (props.body.start_date !== undefined) {
    dateFilterInput.gte = props.body.start_date;
  }
  if (props.body.end_date !== undefined) {
    dateFilterInput.lte = props.body.end_date;
  }
  const whereInput = {
    section: { deleted_at: null },
    ...(props.body.min_view_count !== undefined && {
      view_count: { gte: props.body.min_view_count },
    }),
    ...(props.body.max_view_count !== undefined && {
      view_count: { lte: props.body.max_view_count },
    }),
    ...(props.body.min_article_count !== undefined && {
      article_count: { gte: props.body.min_article_count },
    }),
    ...(props.body.max_article_count !== undefined && {
      article_count: { lte: props.body.max_article_count },
    }),
    ...(props.body.min_comment_count !== undefined && {
      comment_count: { gte: props.body.min_comment_count },
    }),
    ...(props.body.max_comment_count !== undefined && {
      comment_count: { lte: props.body.max_comment_count },
    }),
    ...(Object.keys(dateFilterInput).length > 0 && {
      last_activity_at: dateFilterInput,
    }),
  } satisfies Prisma.discussion_board_section_statisticsWhereInput;
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_section_statistics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { last_activity_at: "desc" },
      ...DiscussionBoardSectionStatisticAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_section_statistics.count(
    {
      where: whereInput,
    },
  );
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionStatisticAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
