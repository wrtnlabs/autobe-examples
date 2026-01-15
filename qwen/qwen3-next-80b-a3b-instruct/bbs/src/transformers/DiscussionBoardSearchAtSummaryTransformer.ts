import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearch";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSearchAtSummaryTransformer {
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
            id: true,
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
          },
        },
        discussion_board_citizen_trust_scores: {
          select: true,
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
  ): Promise<IDiscussionBoardSearch.ISummary> {
    return {
      id: input.id,
      username: input.email.split("@", 1)[0],
      registration_date: toISOStringSafe(input.created_at),
      trust_score:
        input.discussion_board_citizen_trust_scores?.trust_score ?? undefined,
      status:
        input.discussion_board_bans.length > 0
          ? "banned"
          : input.discussion_board_citizen_suspensions.length > 0
            ? "suspended"
            : "active",
    };
  }
}
