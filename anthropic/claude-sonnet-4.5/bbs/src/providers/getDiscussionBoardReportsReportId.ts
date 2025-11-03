import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReport> {
  const { member, reportId } = props;

  const report =
    await MyGlobal.prisma.discussion_board_reports.findUniqueOrThrow({
      where: { id: reportId },
      include: {
        reporter: true,
        reportedArticle: {
          include: {
            author: true,
            discussion_board_article_categories: {
              include: {
                category: true,
              },
            },
            discussion_board_article_tags: {
              include: {
                tag: true,
              },
            },
          },
        },
        reportedComment: {
          include: {
            memberAuthor: true,
            moderatorAuthor: true,
          },
        },
        reviewingModerator: true,
      },
    });

  if (report.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only access your own reports",
      403,
    );
  }

  return {
    id: report.id,
    discussion_board_member_id: report.discussion_board_member_id,
    reported_article_id: report.reported_article_id ?? null,
    reported_comment_id: report.reported_comment_id ?? null,
    reviewing_moderator_id: report.reviewing_moderator_id ?? null,
    report_reason: report.report_reason,
    report_details: report.report_details,
    status: report.status,
    resolution_notes: report.resolution_notes,
    reporter: {
      id: report.reporter.id,
      username: report.reporter.username,
      display_name: report.reporter.display_name ?? null,
      profile_picture_url: report.reporter.profile_picture_url ?? null,
    },
    reportedArticle: report.reportedArticle
      ? {
          id: report.reportedArticle.id,
          title: report.reportedArticle.title,
          summary: report.reportedArticle.summary,
          status: report.reportedArticle.status,
          view_count: report.reportedArticle.view_count,
          comment_count: report.reportedArticle.comment_count,
          author: {
            id: report.reportedArticle.author.id,
            username: report.reportedArticle.author.username,
            display_name: report.reportedArticle.author.display_name ?? null,
            profile_picture_url:
              report.reportedArticle.author.profile_picture_url ?? null,
          },
          categories:
            report.reportedArticle.discussion_board_article_categories.map(
              (ac) => ({
                id: ac.category.id,
                name: ac.category.name,
                slug: ac.category.slug,
                description: ac.category.description ?? null,
                created_at: toISOStringSafe(ac.category.created_at),
                updated_at: toISOStringSafe(ac.category.updated_at),
              }),
            ),
          tags: report.reportedArticle.discussion_board_article_tags.map(
            (at) => ({
              id: at.tag.id,
              name: at.tag.name,
              slug: at.tag.slug,
              created_at: toISOStringSafe(at.tag.created_at),
              updated_at: toISOStringSafe(at.tag.updated_at),
            }),
          ),
          created_at: toISOStringSafe(report.reportedArticle.created_at),
          updated_at: toISOStringSafe(report.reportedArticle.updated_at),
          deleted_at: report.reportedArticle.deleted_at
            ? toISOStringSafe(report.reportedArticle.deleted_at)
            : null,
        }
      : null,
    reportedComment: report.reportedComment
      ? {
          id: report.reportedComment.id,
          content: report.reportedComment.content,
          author_type: report.reportedComment.author_type,
          memberAuthor: report.reportedComment.memberAuthor
            ? {
                id: report.reportedComment.memberAuthor.id,
                username: report.reportedComment.memberAuthor.username,
                display_name:
                  report.reportedComment.memberAuthor.display_name ?? null,
                profile_picture_url:
                  report.reportedComment.memberAuthor.profile_picture_url ??
                  null,
              }
            : null,
          moderatorAuthor: report.reportedComment.moderatorAuthor
            ? {
                id: report.reportedComment.moderatorAuthor.id,
                username: report.reportedComment.moderatorAuthor.username,
                display_name:
                  report.reportedComment.moderatorAuthor.display_name,
                profile_picture_url:
                  report.reportedComment.moderatorAuthor.profile_picture_url ??
                  null,
                email_verified:
                  report.reportedComment.moderatorAuthor.email_verified,
                status: report.reportedComment.moderatorAuthor.status,
                moderation_permissions:
                  report.reportedComment.moderatorAuthor.moderation_permissions,
                profile_visibility:
                  report.reportedComment.moderatorAuthor.profile_visibility,
                activity_visibility:
                  report.reportedComment.moderatorAuthor.activity_visibility,
                bio: report.reportedComment.moderatorAuthor.bio ?? null,
                location:
                  report.reportedComment.moderatorAuthor.location ?? null,
                website_url:
                  report.reportedComment.moderatorAuthor.website_url ?? null,
                last_login_at: report.reportedComment.moderatorAuthor
                  .last_login_at
                  ? toISOStringSafe(
                      report.reportedComment.moderatorAuthor.last_login_at,
                    )
                  : null,
                created_at: toISOStringSafe(
                  report.reportedComment.moderatorAuthor.created_at,
                ),
                updated_at: toISOStringSafe(
                  report.reportedComment.moderatorAuthor.updated_at,
                ),
                deleted_at: report.reportedComment.moderatorAuthor.deleted_at
                  ? toISOStringSafe(
                      report.reportedComment.moderatorAuthor.deleted_at,
                    )
                  : null,
              }
            : null,
          created_at: toISOStringSafe(report.reportedComment.created_at),
          updated_at: toISOStringSafe(report.reportedComment.updated_at),
        }
      : null,
    reviewingModerator: report.reviewingModerator
      ? {
          id: report.reviewingModerator.id,
          username: report.reviewingModerator.username,
          display_name: report.reviewingModerator.display_name,
          profile_picture_url:
            report.reviewingModerator.profile_picture_url ?? null,
          email_verified: report.reviewingModerator.email_verified,
          status: report.reviewingModerator.status,
          moderation_permissions:
            report.reviewingModerator.moderation_permissions,
          profile_visibility: report.reviewingModerator.profile_visibility,
          activity_visibility: report.reviewingModerator.activity_visibility,
          bio: report.reviewingModerator.bio ?? null,
          location: report.reviewingModerator.location ?? null,
          website_url: report.reviewingModerator.website_url ?? null,
          last_login_at: report.reviewingModerator.last_login_at
            ? toISOStringSafe(report.reviewingModerator.last_login_at)
            : null,
          created_at: toISOStringSafe(report.reviewingModerator.created_at),
          updated_at: toISOStringSafe(report.reviewingModerator.updated_at),
          deleted_at: report.reviewingModerator.deleted_at
            ? toISOStringSafe(report.reviewingModerator.deleted_at)
            : null,
        }
      : null,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
