import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import { IDiscussionBoardCommentReportSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReportSummary";
import { IDiscussionBoardCommentModAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModAction";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ICommentReactions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentReactions";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardCitizenAtSummaryTransformer } from "./DiscussionBoardCitizenAtSummaryTransformer";
import { DiscussionBoardModeratorAtSummaryTransformer } from "./DiscussionBoardModeratorAtSummaryTransformer";
import { DiscussionBoardCommentModActionAtSummaryTransformer } from "./DiscussionBoardCommentModActionAtSummaryTransformer";

export namespace DiscussionBoardArticleCommentAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: {
          select: {
            id: true,
          },
        },
        citizen: DiscussionBoardCitizenAtSummaryTransformer.select(),
        discussion_board_attachments: {
          select: {
            id: true,
            type: true,
            created_at: true,
          },
        },
        discussion_board_archives: {
          select: {
            id: true,
          },
        },
        discussion_board_comment_replies: {
          select: {
            id: true,
          },
        },
        discussion_board_comment_reports: {
          select: {
            id: true,
          },
        },
        discussion_board_comment_votes: {
          select: {
            value: true,
          },
        },
        discussion_board_comment_mod_actions: {
          select: {
            id: true,
            type: true,
            created_at: true,
            action: true,
            reason: true,
            moderator: DiscussionBoardModeratorAtSummaryTransformer.select(),
          },
        },
        discussion_board_comment_notifications: {
          select: {
            id: true,
          },
        },
        discussion_board_moderation_audit_trails: {
          select: {
            id: true,
          },
        },
        discussion_board_report_aggregations: {
          select: {
            id: true,
          },
        },
        discussion_board_notification_records: {
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
        _count: {
          select: {
            discussion_board_comment_votes: true,
            discussion_board_comment_replies: true,
            discussion_board_comment_reports: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleComment.ISummary> {
    // Get upvote and downvote counts from votes
    const upvoteCount = input.discussion_board_comment_votes.filter(
      (v) => v.value === 1,
    ).length;
    const downvoteCount = input.discussion_board_comment_votes.filter(
      (v) => v.value === -1,
    ).length;
    // Get reaction counts from attachments
    const reactions: ICommentReactions = {};
    input.discussion_board_attachments.forEach((img) => {
      // Map attachment types to reactions
      switch (img.type) {
        case "like":
          reactions.like = (reactions.like || 0) + 1;
          break;
        case "laugh":
          reactions.laugh = (reactions.laugh || 0) + 1;
          break;
        case "support":
          reactions.support = (reactions.support || 0) + 1;
          break;
        case "surprised":
          reactions.surprised = (reactions.surprised || 0) + 1;
          break;
        case "care":
          reactions.care = (reactions.care || 0) + 1;
          break;
      }
    });
    // Get latest moderation action by sorting by created_at desc
    const sortedModActions = input.discussion_board_comment_mod_actions.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    );
    const latestModAction =
      sortedModActions.length > 0 ? sortedModActions[0] : undefined;
    // Return null for moderation_actions if no action exists (since 'none' is not a valid enum value in the target type)
    const moderationActions = latestModAction
      ? await DiscussionBoardCommentModActionAtSummaryTransformer.transform(
          latestModAction,
        )
      : null;
    return {
      id: input.id,
      content: input.body.substring(0, 100), // Truncated per DTO description
      created_at: toISOStringSafe(input.created_at),
      upvote_count: upvoteCount,
      downvote_count: downvoteCount,
      reply_count: input._count.discussion_board_comment_replies,
      has_replies: input._count.discussion_board_comment_replies > 0,
      author: await DiscussionBoardCitizenAtSummaryTransformer.transform(
        input.citizen,
      ),
      article_id: input.post.id,
      is_flagged: input._count.discussion_board_comment_reports > 0,
      is_my_vote: "none", // Handled by API layer based on authentication context
      report_summary: "", // String type, inline mapping
      moderation_actions: moderationActions,
      reactions: reactions,
    };
  }
}
