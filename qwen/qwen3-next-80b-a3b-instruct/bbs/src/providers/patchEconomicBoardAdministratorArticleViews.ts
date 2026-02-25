import { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicBoardArticleViewAtSummaryTransformer } from "../transformers/EconomicBoardArticleViewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardAdministratorArticleViews(props: {
  administrator: AdministratorPayload;
  body: IEconomicBoardArticleView.IRequest;
}): Promise<IPageIEconomicBoardArticleView.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Extract the transformer's where clause for filtering
  const transformerWhere =
    EconomicBoardArticleViewAtSummaryTransformer.groupBy().where;
  // Build the full where clause by combining transformer's where with request filters
  const whereInput = {
    ...transformerWhere,
    ...(props.body.article_id && { article_id: props.body.article_id }),
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.user_type && { user_type: props.body.user_type }),
    ...(props.body.start_date && {
      created_at: { gte: props.body.start_date },
    }),
    ...(props.body.end_date && { created_at: { lte: props.body.end_date } }),
  } satisfies Prisma.economic_board_article_viewsWhereInput;
  // Construct the Prisma groupByArgs with explicitly required fields
  const groupByArgs = {
    by: ["article_id"] as const, // Required: array of scalar field enums
    _count: { id: true, user_id: true },
    _min: { created_at: true },
    _max: { created_at: true },
    orderBy: { article_id: "asc" }, // Required when take is used
    where: whereInput,
    skip,
    take: limit,
  } satisfies Prisma.economic_board_article_viewsGroupByArgs;
  // Execute groupBy
  const data =
    await MyGlobal.prisma.economic_board_article_views.groupBy(groupByArgs);
  // Count total for pagination
  const total = await MyGlobal.prisma.economic_board_article_views.count({
    where: whereInput,
  });
  // Transform results using transformer — transformer's transform expects the groupBy output structure
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicBoardArticleViewAtSummaryTransformer.transform,
  );
  // Return correctly structured response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
