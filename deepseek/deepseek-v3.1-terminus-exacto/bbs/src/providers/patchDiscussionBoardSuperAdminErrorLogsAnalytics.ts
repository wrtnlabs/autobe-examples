import { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
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

export async function patchDiscussionBoardSuperAdminErrorLogsAnalytics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardErrorLog.IRequest;
}): Promise<IPageIDiscussionBoardErrorLog.ISummary> {
  const page = 1;
  const limit = 100; // Use default since limit doesn't exist in IRequest
  const skip = (page - 1) * limit;
  // Build WHERE conditions using string dates directly
  const whereInput: Prisma.discussion_board_error_logsWhereInput = {
    deleted_at: null,
    ...(props.body.start_date && {
      occurred_at: {
        gte: props.body.start_date, // Use string directly since Prisma handles ISO strings
      },
    }),
    ...(props.body.end_date && {
      occurred_at: {
        lte: props.body.end_date, // Use string directly
      },
    }),
    ...(props.body.error_types &&
      props.body.error_types.length > 0 && {
        error_type: { in: props.body.error_types },
      }),
    ...(props.body.severities &&
      props.body.severities.length > 0 && {
        severity: { in: props.body.severities },
      }),
    ...(props.body.components &&
      props.body.components.length > 0 && {
        component: { in: props.body.components },
      }),
    ...(props.body.environments &&
      props.body.environments.length > 0 && {
        environment: { in: props.body.environments },
      }),
  };
  // Use Prisma's groupBy for aggregation instead of raw SQL
  const aggregatedData =
    await MyGlobal.prisma.discussion_board_error_logs.groupBy({
      by: ["error_type", "severity", "component", "environment"],
      where: whereInput,
      _count: {
        _all: true,
      },
      _min: {
        occurred_at: true,
      },
      _max: {
        occurred_at: true,
      },
      orderBy: {
        _count: {
          error_type: "desc", // Use valid field instead of _all
        },
      },
      skip: skip,
      take: limit,
    });
  // Get total count for pagination using the same WHERE conditions
  const total = await MyGlobal.prisma.discussion_board_error_logs.count({
    where: whereInput,
  });
  // Transform the aggregated data to match the DTO structure
  const transformedData = aggregatedData.map((item) => ({
    error_type: item.error_type,
    severity: item.severity,
    component: item.component === null ? undefined : item.component,
    environment: item.environment,
    error_count: typia.assert<number & tags.Type<"int32">>(
      item._count?._all ?? 0,
    ),
    first_occurred_at: toISOStringSafe(item._min?.occurred_at ?? new Date()),
    last_occurred_at: toISOStringSafe(item._max?.occurred_at ?? new Date()),
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
