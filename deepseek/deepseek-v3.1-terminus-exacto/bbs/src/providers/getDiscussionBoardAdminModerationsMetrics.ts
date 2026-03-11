import { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemHealthMetricAtSummaryTransformer } from "../transformers/DiscussionBoardSystemHealthMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminModerationsMetrics(props: {
  admin: AdminPayload;
}): Promise<IPageIDiscussionBoardSystemHealthMetric.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { collection_timestamp: "desc" },
      ...DiscussionBoardSystemHealthMetricAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_system_health_metrics.count({
      where: { deleted_at: null },
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSystemHealthMetricAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
