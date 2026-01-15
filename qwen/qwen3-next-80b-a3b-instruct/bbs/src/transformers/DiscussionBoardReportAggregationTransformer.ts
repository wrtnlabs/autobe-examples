import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardReportAggregation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportAggregation";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardReportAggregationTransformer {
  export type Payload = Prisma.discussion_board_report_aggregationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_report_aggregationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardReportAggregation> {
    return {
      id: input.id,
      total_reports: input.count,
      resolved_reports: 0,
      pending_reports: 0,
      average_response_time_hours: 0,
      reported_users_count: 0,
      active_moderators: 0,
      reported_content_types: {
        articles: 0,
        comments: 0,
        files: 0,
        images: 0,
        reputation: 0,
        system: 0,
      },
      moderation_actions: {
        dismissals: 0,
        removals: 0,
        warnings: 0,
        suspensions: 0,
        bans: 0,
        content_restorations: 0,
      },
      trust_score_changes: "",
      report_resolution_rate: 0,
      start_date: "",
      end_date: "",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      report_category_counts: undefined,
    };
  }
}
