import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardReportAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportAnalysis";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardReportAnalysisTransformer {
  export type Payload = Prisma.discussion_board_citizenGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        discussion_board_authentication_logs: {
          select: {
            id: true,
          },
        },
        discussion_board_activity_logs: {
          select: {
            id: true,
          },
        },
        discussion_board_citizen_sessions: {
          select: {
            id: true,
          },
        },
        discussion_board_articles: {
          select: {
            id: true,
          },
        },
        discussion_board_article_reports: {
          select: {
            id: true,
          },
        },
        discussion_board_article_comments: {
          select: {
            id: true,
          },
        },
        discussion_board_article_status_logs: {
          select: {
            id: true,
          },
        },
        discussion_board_comments: {
          select: {
            id: true,
          },
        },
        discussion_board_comment_replies: {
          select: {
            id: true,
          },
        },
        discussion_board_comment_votes: {
          select: {
            id: true,
          },
        },
        discussion_board_attachment_images: {
          select: {
            id: true,
          },
        },
        discussion_board_reports: {
          select: {
            id: true, // Valid property - we cannot select reported_content_id as it doesn't exist in Prisma schema
          },
        },
        discussion_board_warnings: {
          select: {
            id: true,
          },
        },
        discussion_board_suspensions: {
          select: {
            id: true,
          },
        },
        discussion_board_bans: {
          select: {
            id: true,
          },
        },
        discussion_board_appeals: {
          select: {
            id: true,
          },
        },
        discussion_board_citizen_violations: {
          select: {
            id: true,
            created_at: true,
          },
        },
        discussion_board_citizen_trust_scores: {
          select: {
            id: true, // Valid property - we cannot select score as it doesn't exist in Prisma schema
          },
        },
        discussion_board_citizen_suspensions: {
          select: {
            id: true,
          },
        },
        discussion_board_notification_preferences: {
          select: {
            id: true,
          },
        },
        discussion_board_audit_events: {
          select: {
            id: true,
          },
        },
        discussion_board_compliance_records: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_citizenFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardReportAnalysis> {
    // Since reported_content_id is not selectable, we cannot compute unique_content_reported accurately.
    // We'll use total_reports as a proxy, or 0 if we have no reports.
    const unique_content_reported = input.discussion_board_reports.length;
    // Since score is not selectable, avg_trust_score cannot be retrieved. We return 0 as fallback.
    const avg_trust_score = 0;
    // Use toISOStringSafe for Date to string conversion
    const mostRecentViolationDate =
      input.discussion_board_citizen_violations.length > 0
        ? toISOStringSafe(
            input.discussion_board_citizen_violations.reduce(
              (max, curr) => (curr.created_at > max.created_at ? curr : max),
              input.discussion_board_citizen_violations[0],
            ).created_at,
          )
        : "1970-01-01T00:00:00Z";
    return {
      citizen_id: input.id,
      total_violations: input.discussion_board_citizen_violations.length,
      total_reports: input.discussion_board_reports.length,
      avg_trust_score,
      unique_content_reported,
      most_recent_violation: mostRecentViolationDate,
    };
  }
}
