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

export async function patchDiscussionBoardAdminPerformanceMetrics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardPerformanceMetric.IRequest;
}): Promise<IPageIDiscussionBoardPerformanceMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Since the DTO describes user statistics but we're querying performance metrics,
  // we need to map the filtering parameters appropriately
  const whereConditions: Prisma.discussion_board_performance_metricsWhereInput[] =
    [];
  if (props.body.registration_date_start) {
    whereConditions.push({
      collection_timestamp: {
        gte: toISOStringSafe(new Date(props.body.registration_date_start)),
      },
    });
  }
  if (props.body.registration_date_end) {
    whereConditions.push({
      collection_timestamp: {
        lte: toISOStringSafe(new Date(props.body.registration_date_end)),
      },
    });
  }
  if (props.body.last_activity_start) {
    whereConditions.push({
      collection_timestamp: {
        gte: toISOStringSafe(new Date(props.body.last_activity_start)),
      },
    });
  }
  if (props.body.last_activity_end) {
    whereConditions.push({
      collection_timestamp: {
        lte: toISOStringSafe(new Date(props.body.last_activity_end)),
      },
    });
  }
  const whereInput: Prisma.discussion_board_performance_metricsWhereInput = {
    AND: whereConditions.length > 0 ? whereConditions : undefined,
  };
  // Build ORDER BY based on sort_by parameter
  const orderByInput: Prisma.discussion_board_performance_metricsOrderByWithRelationInput =
    props.body.sort_by === "article_count"
      ? { metric_value: props.body.sort_order === "asc" ? "asc" : "desc" }
      : props.body.sort_by === "comment_count"
        ? { metric_value: props.body.sort_order === "asc" ? "asc" : "desc" }
        : props.body.sort_by === "last_activity"
          ? {
              collection_timestamp:
                props.body.sort_order === "asc" ? "asc" : "desc",
            }
          : props.body.sort_by === "registration_date"
            ? {
                collection_timestamp:
                  props.body.sort_order === "asc" ? "asc" : "desc",
              }
            : { collection_timestamp: "desc" };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_performance_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    }),
    MyGlobal.prisma.discussion_board_performance_metrics.count({
      where: whereInput,
    }),
  ]);
  // Transform data to ISummary format
  const transformedData = data.map((metric) => ({
    id: metric.id,
    metric_type: metric.metric_type,
    metric_value: metric.metric_value,
    metric_unit: metric.metric_unit,
    source_component: metric.source_component,
    collection_timestamp: toISOStringSafe(metric.collection_timestamp),
    time_range: metric.time_range,
    metadata: metric.metadata ?? undefined,
  }));
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
