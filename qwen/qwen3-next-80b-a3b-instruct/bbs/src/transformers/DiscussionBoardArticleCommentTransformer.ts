import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardCitizenAtSummaryTransformer } from "./DiscussionBoardCitizenAtSummaryTransformer";

export namespace DiscussionBoardArticleCommentTransformer {
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
        post: true,
        citizen: DiscussionBoardCitizenAtSummaryTransformer.select(),
        discussion_board_attachments: true,
        discussion_board_archives: true,
        discussion_board_comment_replies: true,
        discussion_board_comment_reports: true,
        discussion_board_comment_votes: true,
        discussion_board_comment_mod_actions: true,
        discussion_board_comment_notifications: true,
        discussion_board_moderation_audit_trails: true,
        discussion_board_report_aggregations: true,
        discussion_board_notification_records: true,
        discussion_board_audit_events: true,
        discussion_board_compliance_records: true,
      },
    } satisfies Prisma.discussion_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleComment> {
    return {
      id: input.id,
      content: input.body,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      status: input.deleted_at ? "deleted" : "active",
      author: await DiscussionBoardCitizenAtSummaryTransformer.transform(
        input.citizen,
      ),
    };
  }
}
