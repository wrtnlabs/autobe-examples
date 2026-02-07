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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminErrorLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardErrorLog.IRequest;
}): Promise<IPageIDiscussionBoardErrorLog.ISummary> {
  const page = 1; // Default page since it's not in IRequest
  const limit = 100; // Default limit since it's not in IRequest
  const skip = (page - 1) * limit;
  // Build WHERE conditions using string comparisons (no Date conversion)
  const whereInput: Prisma.discussion_board_error_logsWhereInput = {
    deleted_at: null,
    ...(props.body.start_date && {
      occurred_at: { gte: props.body.start_date },
    }),
    ...(props.body.end_date && {
      occurred_at: { lte: props.body.end_date },
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
  // Get aggregated error log groups with proper orderBy
  const groupedData = await MyGlobal.prisma.discussion_board_error_logs.groupBy(
    {
      by: ["error_type", "severity", "component", "environment"],
      where: whereInput,
      _count: { id: true },
      _min: { occurred_at: true },
      _max: { occurred_at: true },
      skip,
      take: limit,
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    },
  );
  // Get total count of distinct groups for pagination
  const distinctGroups =
    await MyGlobal.prisma.discussion_board_error_logs.groupBy({
      by: ["error_type", "severity", "component", "environment"],
      where: whereInput,
      _count: { id: true },
    });
  // Transform grouped data to response format with proper null handling
  const data: IDiscussionBoardErrorLog.ISummary[] = groupedData.map(
    (group: any) => {
      const firstOccurred = group._min.occurred_at;
      const lastOccurred = group._max.occurred_at;
      if (!firstOccurred || !lastOccurred) {
        throw new HttpException("Invalid error log aggregation data", 500);
      }
      return {
        error_type: group.error_type,
        severity: group.severity,
        component: group.component ?? undefined,
        environment: group.environment,
        error_count: group._count.id as number & tags.Type<"int32">,
        first_occurred_at: toISOStringSafe(firstOccurred) as string &
          tags.Format<"date-time">,
        last_occurred_at: toISOStringSafe(lastOccurred) as string &
          tags.Format<"date-time">,
      };
    },
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: distinctGroups.length,
      pages: Math.ceil(distinctGroups.length / limit),
    } satisfies IPage.IPagination,
  };
}
