import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postDiscussionBoardAdminModerationActions(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationAction.ICreate;
}): Promise<IDiscussionBoardModerationAction> {
  const now = toISOStringSafe(new Date());
  // Validate existence of referenced article, comment, and abuse report if IDs provided
  if (props.body.target_article_id != null) {
    const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: props.body.target_article_id },
    });
    if (!article) {
      throw new HttpException("Target article does not exist", 404);
    }
  }
  if (props.body.target_comment_id != null) {
    const comment =
      await MyGlobal.prisma.discussion_board_article_comments.findUnique({
        where: { id: props.body.target_comment_id },
      });
    if (!comment) {
      throw new HttpException("Target comment does not exist", 404);
    }
  }
  if (props.body.abuse_report_id != null) {
    const abuseReport =
      await MyGlobal.prisma.discussion_board_abuse_reports.findUnique({
        where: { id: props.body.abuse_report_id },
      });
    if (!abuseReport) {
      throw new HttpException("Referenced abuse report does not exist", 404);
    }
  }
  const record =
    await MyGlobal.prisma.discussion_board_moderation_actions.create({
      data: {
        id: v4(),
        admin_id: props.admin.id,
        target_article_id: props.body.target_article_id ?? null,
        target_comment_id: props.body.target_comment_id ?? null,
        abuse_report_id: props.body.abuse_report_id ?? null,
        action_type: props.body.action_type,
        action_reason: props.body.action_reason,
        affected_data_ref: props.body.affected_data_ref,
        created_at: now,
        updated_at: now,
      },
    });
  return {
    id: record.id,
    admin_id: record.admin_id,
    target_article_id: record.target_article_id ?? undefined,
    target_comment_id: record.target_comment_id ?? undefined,
    abuse_report_id: record.abuse_report_id ?? undefined,
    action_type: record.action_type,
    action_reason: record.action_reason,
    affected_data_ref: record.affected_data_ref,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
