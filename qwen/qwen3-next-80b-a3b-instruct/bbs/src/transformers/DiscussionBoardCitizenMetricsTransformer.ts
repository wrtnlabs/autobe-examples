import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCitizenMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenMetrics";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCitizenMetricsTransformer {
  export type Payload = Prisma.discussion_board_citizen_trust_scoresGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        trusted_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        citizen: {
          select: {
            _count: true,
            report_aggregations: true,
            last_suspension_date: true,
            last_violation_date: true,
            authority_level: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_citizen_trust_scoresFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCitizenMetrics> {
    const citizen = input.citizen;
    const reportAgg = citizen.report_aggregations;
    return {
      trustScore: input.trusted_score,
      totalSuspensions: citizen._count?.citizen_suspensions ?? 0,
      totalViolations: citizen._count?.citizen_violations ?? 0,
      reportedContentCount: reportAgg?.reported_content_count ?? 0,
      reportAggregationScore: reportAgg?.report_aggregation_score ?? 0,
      lastSuspensionDate: toISOStringSafe(citizen.last_suspension_date),
      lastViolationDate: toISOStringSafe(citizen.last_violation_date),
      totalReports: reportAgg?.total_report_count ?? 0,
      authorityLevel: citizen.authority_level,
    };
  }
}
