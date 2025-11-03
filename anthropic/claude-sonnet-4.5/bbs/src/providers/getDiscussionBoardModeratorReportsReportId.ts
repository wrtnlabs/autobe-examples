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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReport> {
  const { moderator, reportId } = props;

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

  const reporterSummary: IDiscussionBoardMember.ISummary = {
    id: report.reporter.id as string & tags.Format<"uuid">,
    username: report.reporter.username,
    display_name: report.reporter.display_name,
    profile_picture_url: report.reporter.profile_picture_url as
      | (string & tags.Format<"uri">)
      | null,
  };

  const reportedArticleSummary: IDiscussionBoardArticle.ISummary | null =
    report.reportedArticle
      ? {
          id: report.reportedArticle.id as string & tags.Format<"uuid">,
          title: report.reportedArticle.title,
          summary: report.reportedArticle.summary,
          status: report.reportedArticle.status,
          view_count: report.reportedArticle.view_count,
          comment_count: report.reportedArticle.comment_count,
          author: {
            id: report.reportedArticle.author.id as string &
              tags.Format<"uuid">,
            username: report.reportedArticle.author.username,
            display_name: report.reportedArticle.author.display_name,
            profile_picture_url: report.reportedArticle.author
              .profile_picture_url as (string & tags.Format<"uri">) | null,
          },
          categories:
            report.reportedArticle.discussion_board_article_categories.map(
              (ac) => ({
                id: ac.category.id as string & tags.Format<"uuid">,
                name: ac.category.name,
                slug: ac.category.slug,
                description: ac.category.description,
                created_at: toISOStringSafe(ac.category.created_at),
                updated_at: toISOStringSafe(ac.category.updated_at),
              }),
            ),
          tags: report.reportedArticle.discussion_board_article_tags.map(
            (at) => ({
              id: at.tag.id as string & tags.Format<"uuid">,
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
      : null;

  const reportedCommentSummary: IDiscussionBoardComment.ISummary | null =
    report.reportedComment
      ? {
          id: report.reportedComment.id as string & tags.Format<"uuid">,
          content: report.reportedComment.content,
          author_type: report.reportedComment.author_type,
          memberAuthor: report.reportedComment.memberAuthor
            ? {
                id: report.reportedComment.memberAuthor.id as string &
                  tags.Format<"uuid">,
                username: report.reportedComment.memberAuthor.username,
                display_name: report.reportedComment.memberAuthor.display_name,
                profile_picture_url: report.reportedComment.memberAuthor
                  .profile_picture_url as (string & tags.Format<"uri">) | null,
              }
            : null,
          moderatorAuthor: report.reportedComment.moderatorAuthor
            ? {
                id: report.reportedComment.moderatorAuthor.id as string &
                  tags.Format<"uuid">,
                username: report.reportedComment.moderatorAuthor.username,
                display_name:
                  report.reportedComment.moderatorAuthor.display_name,
                profile_picture_url: report.reportedComment.moderatorAuthor
                  .profile_picture_url as (string & tags.Format<"uri">) | null,
                email_verified:
                  report.reportedComment.moderatorAuthor.email_verified,
                status: report.reportedComment.moderatorAuthor.status,
                moderation_permissions:
                  report.reportedComment.moderatorAuthor.moderation_permissions,
                profile_visibility:
                  report.reportedComment.moderatorAuthor.profile_visibility,
                activity_visibility:
                  report.reportedComment.moderatorAuthor.activity_visibility,
                bio: report.reportedComment.moderatorAuthor.bio,
                location: report.reportedComment.moderatorAuthor.location,
                website_url: report.reportedComment.moderatorAuthor
                  .website_url as (string & tags.Format<"uri">) | null,
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
      : null;

  const reviewingModeratorSummary: IDiscussionBoardModerator.ISummary | null =
    report.reviewingModerator
      ? {
          id: report.reviewingModerator.id as string & tags.Format<"uuid">,
          username: report.reviewingModerator.username,
          display_name: report.reviewingModerator.display_name,
          profile_picture_url: report.reviewingModerator.profile_picture_url as
            | (string & tags.Format<"uri">)
            | null,
          email_verified: report.reviewingModerator.email_verified,
          status: report.reviewingModerator.status,
          moderation_permissions:
            report.reviewingModerator.moderation_permissions,
          profile_visibility: report.reviewingModerator.profile_visibility,
          activity_visibility: report.reviewingModerator.activity_visibility,
          bio: report.reviewingModerator.bio,
          location: report.reviewingModerator.location,
          website_url: report.reviewingModerator.website_url as
            | (string & tags.Format<"uri">)
            | null,
          last_login_at: report.reviewingModerator.last_login_at
            ? toISOStringSafe(report.reviewingModerator.last_login_at)
            : null,
          created_at: toISOStringSafe(report.reviewingModerator.created_at),
          updated_at: toISOStringSafe(report.reviewingModerator.updated_at),
          deleted_at: report.reviewingModerator.deleted_at
            ? toISOStringSafe(report.reviewingModerator.deleted_at)
            : null,
        }
      : null;

  return {
    id: report.id as string & tags.Format<"uuid">,
    discussion_board_member_id: report.discussion_board_member_id as string &
      tags.Format<"uuid">,
    reported_article_id: report.reported_article_id as
      | (string & tags.Format<"uuid">)
      | null,
    reported_comment_id: report.reported_comment_id as
      | (string & tags.Format<"uuid">)
      | null,
    reviewing_moderator_id: report.reviewing_moderator_id as
      | (string & tags.Format<"uuid">)
      | null,
    report_reason: report.report_reason,
    report_details: report.report_details,
    status: report.status,
    resolution_notes: report.resolution_notes,
    reporter: reporterSummary,
    reportedArticle: reportedArticleSummary,
    reportedComment: reportedCommentSummary,
    reviewingModerator: reviewingModeratorSummary,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
