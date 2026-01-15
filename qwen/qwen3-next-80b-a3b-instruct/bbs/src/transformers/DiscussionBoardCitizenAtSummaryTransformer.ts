import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCitizenAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_citizenGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
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
          select: {
            id: true,
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
  ): Promise<IDiscussionBoardCitizen.ISummary> {
    return {
      id: input.id,
      username: input.email,
      account_status:
        input.deleted_at === null
          ? "active"
          : new Date(input.deleted_at) >
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            ? "suspended"
            : "banned",
    };
  }
}
