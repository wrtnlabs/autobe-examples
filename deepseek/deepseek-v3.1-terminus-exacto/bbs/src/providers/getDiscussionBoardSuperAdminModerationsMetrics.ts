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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemHealthMetricAtSummaryTransformer } from "../transformers/DiscussionBoardSystemHealthMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminModerationsMetrics(props: {
  superAdmin: SuperadminPayload;
}): Promise<IPageIDiscussionBoardSystemHealthMetric.ISummary> {
  // Set pagination defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Fetch paginated metrics data
  const data =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: {
        deleted_at: null, // Only non-deleted metrics
      },
      skip,
      take: limit,
      orderBy: {
        collection_timestamp: "desc", // Latest metrics first
      },
      ...DiscussionBoardSystemHealthMetricAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.discussion_board_system_health_metrics.count({
      where: {
        deleted_at: null,
      },
    });
  // Transform each record using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemHealthMetricAtSummaryTransformer.transform,
  );
  // Build pagination response
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
