import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleCommentCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleComment.ICreate;
    discussionBoardArticles: IEntity;
    discussionBoardCitizen: IEntity;
    discussionBoardCitizenSessions: IEntity;
  }) {
    return {
      // UUID for primary key
      id: v4(),
      // Required fields from schema - using exact schema field names
      title: "", // Required scalar field, default to empty string
      body: props.body.content, // Map content from DTO to body field
      // Timestamps
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations - connect to existing entities using exact schema relation names
      post: {
        connect: { id: props.discussionBoardArticles.id },
      },
      citizen: {
        connect: { id: props.discussionBoardCitizen.id },
      },
      // Nullable belongsTo parent relationship - use undefined for omitted
      // Note: discussion_board_comment_parent is the exact relation name in schema for self-reference
      discussion_board_comment_reports: props.body.parent_id
        ? {
            connect: { id: props.body.parent_id },
          }
        : undefined,
      // All hasMany relations - cannot create at creation point
      // These are system-managed and will be populated later by actions
      discussion_board_attachments: undefined,
      discussion_board_archives: undefined,
      discussion_board_comment_replies: undefined,
      discussion_board_comment_reports: undefined,
      discussion_board_comment_votes: undefined,
      discussion_board_comment_mod_actions: undefined,
      discussion_board_comment_notifications: undefined,
      discussion_board_moderation_audit_trails: undefined,
      discussion_board_report_aggregations: undefined,
      discussion_board_notification_records: undefined,
      discussion_board_audit_events: undefined,
      discussion_board_compliance_records: undefined,
    } satisfies Prisma.discussion_board_commentsCreateInput;
  }
}
