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

export async function putDiscussionBoardModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.IUpdate;
}): Promise<IDiscussionBoardReport> {
  const { moderator, reportId, body } = props;

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_reports.update({
    where: { id: reportId },
    data: {
      reviewing_moderator_id: body.reviewing_moderator_id ?? undefined,
      status: body.status ?? undefined,
      resolution_notes: body.resolution_notes ?? undefined,
      updated_at: now,
    },
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

  return {
    id: updated.id,
    discussion_board_member_id: updated.discussion_board_member_id,
    reported_article_id: updated.reported_article_id,
    reported_comment_id: updated.reported_comment_id,
    reviewing_moderator_id: updated.reviewing_moderator_id,
    report_reason: updated.report_reason,
    report_details: updated.report_details,
    status: updated.status,
    resolution_notes: updated.resolution_notes,
    reporter: {
      id: updated.reporter.id,
      username: updated.reporter.username,
      display_name: updated.reporter.display_name ?? undefined,
      profile_picture_url: updated.reporter.profile_picture_url ?? undefined,
    },
    reportedArticle: updated.reportedArticle
      ? {
          id: updated.reportedArticle.id,
          title: updated.reportedArticle.title,
          summary: updated.reportedArticle.summary,
          status: updated.reportedArticle.status,
          view_count: Number(updated.reportedArticle.view_count),
          comment_count: Number(updated.reportedArticle.comment_count),
          author: {
            id: updated.reportedArticle.author.id,
            username: updated.reportedArticle.author.username,
            display_name:
              updated.reportedArticle.author.display_name ?? undefined,
            profile_picture_url:
              updated.reportedArticle.author.profile_picture_url ?? undefined,
          },
          categories:
            updated.reportedArticle.discussion_board_article_categories.map(
              (ac) => ({
                id: ac.category.id,
                name: ac.category.name,
                slug: ac.category.slug,
                description: ac.category.description ?? undefined,
                created_at: toISOStringSafe(ac.category.created_at),
                updated_at: toISOStringSafe(ac.category.updated_at),
              }),
            ),
          tags: updated.reportedArticle.discussion_board_article_tags.map(
            (at) => ({
              id: at.tag.id,
              name: at.tag.name,
              slug: at.tag.slug,
              created_at: toISOStringSafe(at.tag.created_at),
              updated_at: toISOStringSafe(at.tag.updated_at),
            }),
          ),
          created_at: toISOStringSafe(updated.reportedArticle.created_at),
          updated_at: toISOStringSafe(updated.reportedArticle.updated_at),
          deleted_at: updated.reportedArticle.deleted_at
            ? toISOStringSafe(updated.reportedArticle.deleted_at)
            : null,
        }
      : null,
    reportedComment: updated.reportedComment
      ? {
          id: updated.reportedComment.id,
          content: updated.reportedComment.content,
          author_type: updated.reportedComment.author_type,
          memberAuthor: updated.reportedComment.memberAuthor
            ? {
                id: updated.reportedComment.memberAuthor.id,
                username: updated.reportedComment.memberAuthor.username,
                display_name:
                  updated.reportedComment.memberAuthor.display_name ??
                  undefined,
                profile_picture_url:
                  updated.reportedComment.memberAuthor.profile_picture_url ??
                  undefined,
              }
            : null,
          moderatorAuthor: updated.reportedComment.moderatorAuthor
            ? {
                id: updated.reportedComment.moderatorAuthor.id,
                username: updated.reportedComment.moderatorAuthor.username,
                display_name:
                  updated.reportedComment.moderatorAuthor.display_name,
                profile_picture_url:
                  updated.reportedComment.moderatorAuthor.profile_picture_url,
                email_verified:
                  updated.reportedComment.moderatorAuthor.email_verified,
                status: updated.reportedComment.moderatorAuthor.status,
                moderation_permissions:
                  updated.reportedComment.moderatorAuthor
                    .moderation_permissions,
                profile_visibility:
                  updated.reportedComment.moderatorAuthor.profile_visibility,
                activity_visibility:
                  updated.reportedComment.moderatorAuthor.activity_visibility,
                bio: updated.reportedComment.moderatorAuthor.bio ?? undefined,
                location:
                  updated.reportedComment.moderatorAuthor.location ?? undefined,
                website_url:
                  updated.reportedComment.moderatorAuthor.website_url ??
                  undefined,
                last_login_at: updated.reportedComment.moderatorAuthor
                  .last_login_at
                  ? toISOStringSafe(
                      updated.reportedComment.moderatorAuthor.last_login_at,
                    )
                  : undefined,
                created_at: toISOStringSafe(
                  updated.reportedComment.moderatorAuthor.created_at,
                ),
                updated_at: toISOStringSafe(
                  updated.reportedComment.moderatorAuthor.updated_at,
                ),
                deleted_at: updated.reportedComment.moderatorAuthor.deleted_at
                  ? toISOStringSafe(
                      updated.reportedComment.moderatorAuthor.deleted_at,
                    )
                  : undefined,
              }
            : null,
          created_at: toISOStringSafe(updated.reportedComment.created_at),
          updated_at: toISOStringSafe(updated.reportedComment.updated_at),
        }
      : null,
    reviewingModerator: updated.reviewingModerator
      ? {
          id: updated.reviewingModerator.id,
          username: updated.reviewingModerator.username,
          display_name: updated.reviewingModerator.display_name,
          profile_picture_url: updated.reviewingModerator.profile_picture_url,
          email_verified: updated.reviewingModerator.email_verified,
          status: updated.reviewingModerator.status,
          moderation_permissions:
            updated.reviewingModerator.moderation_permissions,
          profile_visibility: updated.reviewingModerator.profile_visibility,
          activity_visibility: updated.reviewingModerator.activity_visibility,
          bio: updated.reviewingModerator.bio ?? undefined,
          location: updated.reviewingModerator.location ?? undefined,
          website_url: updated.reviewingModerator.website_url ?? undefined,
          last_login_at: updated.reviewingModerator.last_login_at
            ? toISOStringSafe(updated.reviewingModerator.last_login_at)
            : undefined,
          created_at: toISOStringSafe(updated.reviewingModerator.created_at),
          updated_at: toISOStringSafe(updated.reviewingModerator.updated_at),
          deleted_at: updated.reviewingModerator.deleted_at
            ? toISOStringSafe(updated.reviewingModerator.deleted_at)
            : undefined,
        }
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
