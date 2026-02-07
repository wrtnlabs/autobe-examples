import { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardErrorLogAtAnalyticsSummaryTransformer {
  export type Payload = Prisma.discussion_board_error_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        error_type: true,
        error_message: true,
        stack_trace: true,
        severity: true,
        request_path: true,
        request_method: true,
        user_agent: true,
        ip_address: true,
        environment: true,
        component: true,
        occurred_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_error_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardErrorLog.IAnalyticsSummary> {
    // This transformer cannot properly compute aggregated statistics
    // from individual error log records. The DTO requires aggregation
    // across multiple records which should be handled at the query level.
    return {
      error_type: input.error_type,
      severity: input.severity,
      component: input.component ?? null,
      environment: input.environment,
      error_count: 1, // Cannot compute aggregated count from single record
      average_occurrence_rate: 0, // Requires aggregation across time periods
      trend_direction: "stable", // Requires analysis of multiple data points
      first_occurrence: toISOStringSafe(input.occurred_at), // Should be min(occurred_at) across group
      last_occurrence: toISOStringSafe(input.occurred_at), // Should be max(occurred_at) across group
    };
  }
}
