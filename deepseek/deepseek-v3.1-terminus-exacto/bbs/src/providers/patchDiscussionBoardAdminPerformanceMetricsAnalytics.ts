import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
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

export async function patchDiscussionBoardAdminPerformanceMetricsAnalytics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardPerformanceMetric.IRequest;
}): Promise<IPageIDiscussionBoardPerformanceMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions based on available filters
  const whereInput = {
    ...(props.body.registration_date_start && {
      collection_timestamp: {
        gte: toISOStringSafe(new Date(props.body.registration_date_start)),
      },
    }),
    ...(props.body.registration_date_end && {
      collection_timestamp: {
        lte: toISOStringSafe(new Date(props.body.registration_date_end)),
      },
    }),
    ...(props.body.last_activity_start && {
      collection_timestamp: {
        gte: toISOStringSafe(new Date(props.body.last_activity_start)),
      },
    }),
    ...(props.body.last_activity_end && {
      collection_timestamp: {
        lte: toISOStringSafe(new Date(props.body.last_activity_end)),
      },
    }),
  } satisfies Prisma.discussion_board_performance_metricsWhereInput;
  // Determine sort order - default to collection_timestamp desc
  const orderByInput = (
    props.body.sort_by === "last_activity" ||
    props.body.sort_by === "registration_date"
      ? {
          collection_timestamp:
            props.body.sort_order === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
      : { collection_timestamp: "desc" as const }
  ) satisfies Prisma.discussion_board_performance_metricsOrderByWithRelationInput;
  // Execute queries
  const data =
    await MyGlobal.prisma.discussion_board_performance_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    });
  const total =
    await MyGlobal.prisma.discussion_board_performance_metrics.count({
      where: whereInput,
    });
  // Since ISummary is empty {}, return empty objects
  const transformedData = data.map(() => ({}));
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
