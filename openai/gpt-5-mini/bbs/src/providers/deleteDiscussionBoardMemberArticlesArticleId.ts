import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, articleId } = props;

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true, discussion_board_member_id: true, deleted_at: true },
  });

  if (!article) throw new HttpException("Not Found", 404);
  if (article.deleted_at !== null) throw new HttpException("Not Found", 404);

  const moderator = await MyGlobal.prisma.discussion_board_moderator.findUnique(
    {
      where: { id: member.id },
      select: { id: true },
    },
  );

  const isModerator = Boolean(moderator);
  if (article.discussion_board_member_id !== member.id && !isModerator) {
    throw new HttpException(
      "Unauthorized: Only the author or a moderator can delete this article",
      403,
    );
  }

  const activeReport = await MyGlobal.prisma.discussion_board_reports.findFirst(
    {
      where: {
        target_type: "article",
        target_id: articleId,
        status: { not: "resolved" },
      },
      select: { id: true },
    },
  );
  if (activeReport)
    throw new HttpException("Conflict: Active report blocks deletion", 409);

  const reports = await MyGlobal.prisma.discussion_board_reports.findMany({
    where: { target_type: "article", target_id: articleId },
    select: { id: true },
  });

  if (reports.length > 0) {
    const reportIds = reports.map((r) => r.id);
    const activeAppeal =
      await MyGlobal.prisma.discussion_board_appeals.findFirst({
        where: { report_id: { in: reportIds }, status: { not: "resolved" } },
        select: { id: true },
      });
    if (activeAppeal)
      throw new HttpException("Conflict: Active appeal blocks deletion", 409);
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: articleId },
    data: { deleted_at: now },
  });

  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      event_type: "article.deleted",
      event_timestamp: now,
      resource_type: "article",
      resource_id: articleId,
      actor_type: "member",
      actor_id: member.id,
      ip: null,
      user_agent: null,
      metadata: JSON.stringify({
        reason: "soft_delete",
        performed_by: member.id,
      }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4(),
      moderation_action_id: null,
      report_id: null,
      actor_moderator_id: null,
      event_type: "article.deleted",
      event_payload: JSON.stringify({ articleId, performed_by: member.id }),
      occurred_at: now,
    },
  });

  if (article.discussion_board_member_id !== null) {
    await MyGlobal.prisma.discussion_board_notifications.create({
      data: {
        id: v4(),
        recipient_member_id: article.discussion_board_member_id,
        discussion_board_subscription_id: null,
        discussion_board_article_id: articleId,
        type: "retention.enqueue",
        payload: JSON.stringify({
          action: "enqueue_attachment_retention",
          articleId,
        }),
        status: "pending",
        priority: 0,
        delivery_attempts: 0,
        last_attempted_at: null,
        next_retry_at: null,
        scheduled_at: now,
        sent_at: null,
        fail_reason: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }

  return;
}
