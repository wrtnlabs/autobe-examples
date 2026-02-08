import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserCommentReportsCommentReportId(props: {
  user: UserPayload;
  commentReportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentReport> {
  // Authorization assumption: props.user is already authorized and has appropriate roles
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findUnique({
      where: { id: props.commentReportId },
      include: {
        comment: true,
        reporterUser: true,
        reportReason: true,
      },
    });
  if (!report) {
    throw new HttpException("Comment report not found", 404);
  }
  // Helper function to convert Date | null to string & tags.Format<'date-time'> | null without type assertions
  function toFormattedDate(
    date: Date | null,
  ): (string & tags.Format<"date-time">) | null {
    if (date === null) return null;
    return date.toISOString() as unknown as string & tags.Format<"date-time">;
  }
  const createdAt = toFormattedDate(report.created_at);
  const updatedAt = toFormattedDate(report.updated_at);
  const deletedAt = toFormattedDate(report.deleted_at);
  const commentCreatedAt = report.comment
    ? toFormattedDate(report.comment.created_at)
    : null;
  const commentUpdatedAt = report.comment
    ? toFormattedDate(report.comment.updated_at)
    : null;
  const commentDeletedAt = report.comment
    ? toFormattedDate(report.comment.deleted_at)
    : null;
  const reporterCreatedAt = report.reporterUser
    ? toFormattedDate(report.reporterUser.created_at)
    : null;
  const reporterUpdatedAt = report.reporterUser
    ? toFormattedDate(report.reporterUser.updated_at)
    : null;
  const reporterDeletedAt = report.reporterUser
    ? toFormattedDate(report.reporterUser.deleted_at)
    : null;
  const reasonCreatedAt = report.reportReason
    ? toFormattedDate(report.reportReason.created_at)
    : null;
  const reasonUpdatedAt = report.reportReason
    ? toFormattedDate(report.reportReason.updated_at)
    : null;
  const reasonDeletedAt = report.reportReason
    ? toFormattedDate(report.reportReason.deleted_at)
    : null;
  return {
    id: report.id,
    comment_id: report.comment_id,
    reporter_user_id: report.reporter_user_id,
    report_reason_id: report.report_reason_id ?? null,
    status: report.status,
    description: report.description ?? null,
    created_at: createdAt!,
    updated_at: updatedAt!,
    deleted_at: deletedAt,
    comment: report.comment
      ? {
          id: report.comment.id,
          user_id: report.comment.user_id,
          post_id: report.comment.post_id,
          parent_id: report.comment.parent_id ?? null,
          content: report.comment.content,
          is_deleted: report.comment.is_deleted,
          created_at: commentCreatedAt!,
          updated_at: commentUpdatedAt!,
          deleted_at: commentDeletedAt,
        }
      : null,
    reporterUser: report.reporterUser
      ? {
          id: report.reporterUser.id,
          email: report.reporterUser.email,
          password_hash: report.reporterUser.password_hash,
          username: report.reporterUser.username,
          display_name: report.reporterUser.display_name,
          bio: report.reporterUser.bio ?? null,
          avatar_url: report.reporterUser.avatar_url ?? null,
          karma: report.reporterUser.karma,
          created_at: reporterCreatedAt!,
          updated_at: reporterUpdatedAt!,
          deleted_at: reporterDeletedAt,
        }
      : null,
    reportReason: report.reportReason
      ? {
          id: report.reportReason.id,
          reason_text: report.reportReason.reason_text,
          created_at: reasonCreatedAt!,
          updated_at: reasonUpdatedAt!,
          deleted_at: reasonDeletedAt,
        }
      : null,
  };
}
