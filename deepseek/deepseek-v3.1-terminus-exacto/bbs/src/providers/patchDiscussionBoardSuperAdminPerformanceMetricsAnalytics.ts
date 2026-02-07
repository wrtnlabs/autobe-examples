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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminPerformanceMetricsAnalytics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardPerformanceMetric.IRequest;
}): Promise<IPageIDiscussionBoardPerformanceMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for performance metrics using flat array construction
  const conditions: Prisma.discussion_board_performance_metricsWhereInput[] =
    [];
  // Date range filtering using collection_timestamp
  if (props.body.registration_date_start) {
    conditions.push({
      collection_timestamp: {
        gte: props.body.registration_date_start,
      },
    });
  }
  if (props.body.registration_date_end) {
    conditions.push({
      collection_timestamp: {
        lte: props.body.registration_date_end,
      },
    });
  }
  // Additional activity date filtering (if needed)
  if (props.body.last_activity_start) {
    conditions.push({
      collection_timestamp: {
        gte: props.body.last_activity_start,
      },
    });
  }
  if (props.body.last_activity_end) {
    conditions.push({
      collection_timestamp: {
        lte: props.body.last_activity_end,
      },
    });
  }
  // Metric-specific filtering
  if (props.body.min_articles !== undefined) {
    conditions.push({
      metric_value: {
        gte: props.body.min_articles,
      },
    });
  }
  if (props.body.min_comments !== undefined) {
    conditions.push({
      metric_value: {
        gte: props.body.min_comments,
      },
    });
  }
  const whereInput: Prisma.discussion_board_performance_metricsWhereInput = {
    AND: conditions.length > 0 ? conditions : undefined,
  };
  // Build ORDER BY based on sort_by parameter
  let orderByInput: Prisma.discussion_board_performance_metricsOrderByWithRelationInput;
  switch (props.body.sort_by) {
    case "article_count":
      orderByInput = {
        metric_value: props.body.sort_order === "asc" ? "asc" : "desc",
      };
      break;
    case "comment_count":
      orderByInput = {
        metric_value: props.body.sort_order === "asc" ? "asc" : "desc",
      };
      break;
    case "last_activity":
      orderByInput = {
        collection_timestamp: props.body.sort_order === "asc" ? "asc" : "desc",
      };
      break;
    case "registration_date":
      orderByInput = {
        collection_timestamp: props.body.sort_order === "asc" ? "asc" : "desc",
      };
      break;
    default:
      orderByInput = { collection_timestamp: "desc" };
      break;
  }
  // Query data
  const data =
    await MyGlobal.prisma.discussion_board_performance_metrics.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        metric_type: true,
        metric_value: true,
        metric_unit: true,
        source_component: true,
        collection_timestamp: true,
        time_range: true,
        metadata: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_performance_metrics.count({
      where: whereInput,
    });
  // Transform data to match ISummary DTO
  const transformedData = data.map((metric) => ({
    id: metric.id as string & tags.Format<"uuid">,
    metric_type: metric.metric_type,
    metric_value: metric.metric_value,
    metric_unit: metric.metric_unit,
    source_component: metric.source_component,
    collection_timestamp: toISOStringSafe(metric.collection_timestamp),
    time_range: metric.time_range,
    metadata: metric.metadata ?? undefined,
    created_at: toISOStringSafe(metric.created_at),
    updated_at: toISOStringSafe(metric.updated_at),
  }));
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
