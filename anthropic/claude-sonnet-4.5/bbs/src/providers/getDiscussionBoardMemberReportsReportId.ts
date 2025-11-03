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

export async function getDiscussionBoardMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReport> {
  const { member, reportId } = props;

  const report =
    await MyGlobal.prisma.discussion_board_reports.findUniqueOrThrow({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            display_name: true,
            profile_picture_url: true,
          },
        },
        reportedArticle: {
          select: {
            id: true,
            title: true,
            summary: true,
            status: true,
            view_count: true,
            comment_count: true,
            discussion_board_member_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        reportedComment: {
          select: {
            id: true,
            content: true,
            author_type: true,
            discussion_board_member_id: true,
            discussion_board_moderator_id: true,
            created_at: true,
            updated_at: true,
          },
        },
        reviewingModerator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            profile_picture_url: true,
            email_verified: true,
            status: true,
            moderation_permissions: true,
            profile_visibility: true,
            activity_visibility: true,
            bio: true,
            location: true,
            website_url: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });

  if (report.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only view your own reports",
      403,
    );
  }

  let reportedArticle: IDiscussionBoardArticle.ISummary | null = null;
  if (report.reportedArticle) {
    const [articleAuthor, articleCategories, articleTags] = await Promise.all([
      MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
        where: { id: report.reportedArticle.discussion_board_member_id },
        select: {
          id: true,
          username: true,
          display_name: true,
          profile_picture_url: true,
        },
      }),
      MyGlobal.prisma.discussion_board_article_categories.findMany({
        where: { discussion_board_article_id: report.reportedArticle.id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      }),
      MyGlobal.prisma.discussion_board_article_tags.findMany({
        where: { discussion_board_article_id: report.reportedArticle.id },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      }),
    ]);

    reportedArticle = {
      id: report.reportedArticle.id,
      title: report.reportedArticle.title,
      summary: report.reportedArticle.summary,
      status: report.reportedArticle.status,
      view_count: report.reportedArticle.view_count,
      comment_count: report.reportedArticle.comment_count,
      author: {
        id: articleAuthor.id,
        username: articleAuthor.username,
        display_name: articleAuthor.display_name ?? undefined,
        profile_picture_url: articleAuthor.profile_picture_url ?? undefined,
      },
      categories: articleCategories.map((ac) => ({
        id: ac.category.id,
        name: ac.category.name,
        slug: ac.category.slug,
        description: ac.category.description ?? undefined,
        created_at: toISOStringSafe(ac.category.created_at),
        updated_at: toISOStringSafe(ac.category.updated_at),
      })),
      tags: articleTags.map((at) => ({
        id: at.tag.id,
        name: at.tag.name,
        slug: at.tag.slug,
        created_at: toISOStringSafe(at.tag.created_at),
        updated_at: toISOStringSafe(at.tag.updated_at),
      })),
      created_at: toISOStringSafe(report.reportedArticle.created_at),
      updated_at: toISOStringSafe(report.reportedArticle.updated_at),
      deleted_at: report.reportedArticle.deleted_at
        ? toISOStringSafe(report.reportedArticle.deleted_at)
        : null,
    };
  }

  let reportedComment: IDiscussionBoardComment.ISummary | null = null;
  if (report.reportedComment) {
    let memberAuthor: IDiscussionBoardMember.ISummary | null = null;
    let moderatorAuthor: IDiscussionBoardModerator.ISummary | null = null;

    if (
      report.reportedComment.author_type === "member" &&
      report.reportedComment.discussion_board_member_id
    ) {
      const commentMemberAuthor =
        await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
          where: { id: report.reportedComment.discussion_board_member_id },
          select: {
            id: true,
            username: true,
            display_name: true,
            profile_picture_url: true,
          },
        });
      memberAuthor = {
        id: commentMemberAuthor.id,
        username: commentMemberAuthor.username,
        display_name: commentMemberAuthor.display_name ?? undefined,
        profile_picture_url:
          commentMemberAuthor.profile_picture_url ?? undefined,
      };
    } else if (
      report.reportedComment.author_type === "moderator" &&
      report.reportedComment.discussion_board_moderator_id
    ) {
      const commentModeratorAuthor =
        await MyGlobal.prisma.discussion_board_moderators.findUniqueOrThrow({
          where: { id: report.reportedComment.discussion_board_moderator_id },
          select: {
            id: true,
            username: true,
            display_name: true,
            profile_picture_url: true,
            email_verified: true,
            status: true,
            moderation_permissions: true,
            profile_visibility: true,
            activity_visibility: true,
            bio: true,
            location: true,
            website_url: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        });
      moderatorAuthor = {
        id: commentModeratorAuthor.id,
        username: commentModeratorAuthor.username,
        display_name: commentModeratorAuthor.display_name,
        profile_picture_url: commentModeratorAuthor.profile_picture_url,
        email_verified: commentModeratorAuthor.email_verified,
        status: commentModeratorAuthor.status,
        moderation_permissions: commentModeratorAuthor.moderation_permissions,
        profile_visibility: commentModeratorAuthor.profile_visibility,
        activity_visibility: commentModeratorAuthor.activity_visibility,
        bio: commentModeratorAuthor.bio ?? undefined,
        location: commentModeratorAuthor.location ?? undefined,
        website_url: commentModeratorAuthor.website_url ?? undefined,
        last_login_at: commentModeratorAuthor.last_login_at
          ? toISOStringSafe(commentModeratorAuthor.last_login_at)
          : undefined,
        created_at: toISOStringSafe(commentModeratorAuthor.created_at),
        updated_at: toISOStringSafe(commentModeratorAuthor.updated_at),
        deleted_at: commentModeratorAuthor.deleted_at
          ? toISOStringSafe(commentModeratorAuthor.deleted_at)
          : undefined,
      };
    }

    reportedComment = {
      id: report.reportedComment.id,
      content: report.reportedComment.content,
      author_type: report.reportedComment.author_type,
      memberAuthor: memberAuthor,
      moderatorAuthor: moderatorAuthor,
      created_at: toISOStringSafe(report.reportedComment.created_at),
      updated_at: toISOStringSafe(report.reportedComment.updated_at),
    };
  }

  let reviewingModerator: IDiscussionBoardModerator.ISummary | null = null;
  if (report.reviewingModerator) {
    reviewingModerator = {
      id: report.reviewingModerator.id,
      username: report.reviewingModerator.username,
      display_name: report.reviewingModerator.display_name,
      profile_picture_url: report.reviewingModerator.profile_picture_url,
      email_verified: report.reviewingModerator.email_verified,
      status: report.reviewingModerator.status,
      moderation_permissions: report.reviewingModerator.moderation_permissions,
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
    };
  }

  return {
    id: report.id,
    discussion_board_member_id: report.discussion_board_member_id,
    reported_article_id: report.reported_article_id,
    reported_comment_id: report.reported_comment_id,
    reviewing_moderator_id: report.reviewing_moderator_id,
    report_reason: report.report_reason,
    report_details: report.report_details,
    status: report.status,
    resolution_notes: report.resolution_notes,
    reporter: {
      id: report.reporter.id,
      username: report.reporter.username,
      display_name: report.reporter.display_name ?? undefined,
      profile_picture_url: report.reporter.profile_picture_url ?? undefined,
    },
    reportedArticle: reportedArticle,
    reportedComment: reportedComment,
    reviewingModerator: reviewingModerator,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
