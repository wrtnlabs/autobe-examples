import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.ICreate;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderator, body } = props;

  const now = toISOStringSafe(new Date());
  const actionId = v4();

  const created =
    await MyGlobal.prisma.discussion_board_moderation_actions.create({
      data: {
        id: actionId,
        discussion_board_moderator_id: moderator.id,
        related_report_id: body.related_report_id ?? null,
        action_type: body.action_type,
        target_type: body.target_type,
        target_id: body.target_id,
        reason: body.reason,
        details: body.details ?? null,
        created_at: now,
        updated_at: now,
      },
    });

  const moderatorData =
    await MyGlobal.prisma.discussion_board_moderators.findUniqueOrThrow({
      where: { id: moderator.id },
    });

  let relatedReportSummary: IDiscussionBoardReport.ISummary | null | undefined =
    undefined;

  if (created.related_report_id !== null) {
    const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
      where: { id: created.related_report_id },
      include: {
        reporter: true,
        reviewingModerator: true,
      },
    });

    if (report !== null) {
      const reporterSummary = {
        id: report.reporter.id,
        username: report.reporter.username,
        display_name: report.reporter.display_name ?? undefined,
        profile_picture_url: report.reporter.profile_picture_url ?? undefined,
      } satisfies IDiscussionBoardMember.ISummary;

      let reviewingModeratorSummary: IDiscussionBoardModerator.ISummary | null =
        null;
      if (report.reviewingModerator !== null) {
        reviewingModeratorSummary = {
          id: report.reviewingModerator.id,
          username: report.reviewingModerator.username,
          display_name: report.reviewingModerator.display_name,
          profile_picture_url: report.reviewingModerator.profile_picture_url,
          email_verified: report.reviewingModerator.email_verified,
          status: report.reviewingModerator.status,
          moderation_permissions:
            report.reviewingModerator.moderation_permissions,
          profile_visibility: report.reviewingModerator.profile_visibility,
          activity_visibility: report.reviewingModerator.activity_visibility,
          bio: report.reviewingModerator.bio ?? undefined,
          location: report.reviewingModerator.location ?? undefined,
          website_url: report.reviewingModerator.website_url ?? undefined,
          last_login_at: report.reviewingModerator.last_login_at
            ? toISOStringSafe(report.reviewingModerator.last_login_at)
            : undefined,
          created_at: toISOStringSafe(report.reviewingModerator.created_at),
          updated_at: toISOStringSafe(report.reviewingModerator.updated_at),
          deleted_at: report.reviewingModerator.deleted_at
            ? toISOStringSafe(report.reviewingModerator.deleted_at)
            : undefined,
        } satisfies IDiscussionBoardModerator.ISummary;
      }

      relatedReportSummary = {
        id: report.id,
        reporter: reporterSummary,
        reported_article_id: report.reported_article_id,
        reported_comment_id: report.reported_comment_id,
        reported_content_type:
          report.reported_article_id !== null ? "article" : "comment",
        report_reason: report.report_reason,
        report_details: report.report_details,
        status: typia.assert<
          "pending" | "under_review" | "resolved" | "dismissed"
        >(report.status),
        resolution_notes: report.resolution_notes,
        reviewing_moderator: reviewingModeratorSummary,
        created_at: toISOStringSafe(report.created_at),
        updated_at: toISOStringSafe(report.updated_at),
        deleted_at:
          report.deleted_at !== null
            ? toISOStringSafe(report.deleted_at)
            : null,
      } satisfies IDiscussionBoardReport.ISummary;
    }
  }

  const moderatorSummary = {
    id: moderatorData.id,
    username: moderatorData.username,
    display_name: moderatorData.display_name,
    profile_picture_url: moderatorData.profile_picture_url,
    email_verified: moderatorData.email_verified,
    status: moderatorData.status,
    moderation_permissions: moderatorData.moderation_permissions,
    profile_visibility: moderatorData.profile_visibility,
    activity_visibility: moderatorData.activity_visibility,
    bio: moderatorData.bio ?? undefined,
    location: moderatorData.location ?? undefined,
    website_url: moderatorData.website_url ?? undefined,
    last_login_at: moderatorData.last_login_at
      ? toISOStringSafe(moderatorData.last_login_at)
      : undefined,
    created_at: toISOStringSafe(moderatorData.created_at),
    updated_at: toISOStringSafe(moderatorData.updated_at),
    deleted_at: moderatorData.deleted_at
      ? toISOStringSafe(moderatorData.deleted_at)
      : undefined,
  } satisfies IDiscussionBoardModerator.ISummary;

  return {
    id: actionId,
    discussion_board_moderator_id: moderator.id,
    related_report_id: created.related_report_id ?? undefined,
    action_type: created.action_type,
    target_type: created.target_type,
    target_id: created.target_id,
    reason: created.reason,
    details: created.details ?? undefined,
    created_at: now,
    updated_at: now,
    moderator: moderatorSummary,
    relatedReport: relatedReportSummary,
  };
}
