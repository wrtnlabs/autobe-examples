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

export async function postDiscussionBoardMemberReports(props: {
  member: MemberPayload;
  body: IDiscussionBoardReport.ICreate;
}): Promise<IDiscussionBoardReport> {
  const { member, body } = props;

  // Validate exactly one target is specified
  if (
    (body.reported_article_id === null ||
      body.reported_article_id === undefined) ===
    (body.reported_comment_id === null ||
      body.reported_comment_id === undefined)
  ) {
    throw new HttpException(
      "Exactly one of reported_article_id or reported_comment_id must be provided",
      400,
    );
  }

  // Verify reported content exists
  if (
    body.reported_article_id !== null &&
    body.reported_article_id !== undefined
  ) {
    const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
      where: {
        id: body.reported_article_id,
        deleted_at: null,
      },
    });
    if (!article) {
      throw new HttpException("Reported article not found", 404);
    }
  }

  if (
    body.reported_comment_id !== null &&
    body.reported_comment_id !== undefined
  ) {
    const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: body.reported_comment_id,
        deleted_at: null,
      },
    });
    if (!comment) {
      throw new HttpException("Reported comment not found", 404);
    }
  }

  // Check for duplicate report
  const existingReport =
    await MyGlobal.prisma.discussion_board_reports.findFirst({
      where: {
        discussion_board_member_id: member.id,
        reported_article_id: body.reported_article_id ?? null,
        reported_comment_id: body.reported_comment_id ?? null,
        deleted_at: null,
      },
    });

  if (existingReport) {
    throw new HttpException("You have already reported this content", 409);
  }

  // Prepare timestamp once for reuse
  const now = toISOStringSafe(new Date());

  // Create the report
  const created = await MyGlobal.prisma.discussion_board_reports.create({
    data: {
      id: v4(),
      discussion_board_member_id: member.id,
      reported_article_id: body.reported_article_id ?? null,
      reported_comment_id: body.reported_comment_id ?? null,
      report_reason: body.report_reason,
      report_details: body.report_details ?? null,
      status: "pending",
      reviewing_moderator_id: null,
      resolution_notes: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
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
    },
  });

  // Build reporter summary
  const reporterSummary = {
    id: created.reporter.id,
    username: created.reporter.username,
    display_name: created.reporter.display_name ?? null,
    profile_picture_url: created.reporter.profile_picture_url ?? null,
  } satisfies IDiscussionBoardMember.ISummary;

  // Build reported article summary if applicable
  let reportedArticleSummary: IDiscussionBoardArticle.ISummary | null = null;
  if (created.reportedArticle) {
    const article = created.reportedArticle;
    reportedArticleSummary = {
      id: article.id,
      title: article.title,
      summary: article.summary,
      status: article.status,
      view_count: article.view_count,
      comment_count: article.comment_count,
      author: {
        id: article.author.id,
        username: article.author.username,
        display_name: article.author.display_name ?? null,
        profile_picture_url: article.author.profile_picture_url ?? null,
      },
      categories: article.discussion_board_article_categories.map((ac) => ({
        id: ac.category.id,
        name: ac.category.name,
        slug: ac.category.slug,
        description: ac.category.description ?? null,
        created_at: toISOStringSafe(ac.category.created_at),
        updated_at: toISOStringSafe(ac.category.updated_at),
      })),
      tags: article.discussion_board_article_tags.map((at) => ({
        id: at.tag.id,
        name: at.tag.name,
        slug: at.tag.slug,
        created_at: toISOStringSafe(at.tag.created_at),
        updated_at: toISOStringSafe(at.tag.updated_at),
      })),
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      deleted_at: article.deleted_at
        ? toISOStringSafe(article.deleted_at)
        : null,
    };
  }

  // Build reported comment summary if applicable
  let reportedCommentSummary: IDiscussionBoardComment.ISummary | null = null;
  if (created.reportedComment) {
    const comment = created.reportedComment;
    reportedCommentSummary = {
      id: comment.id,
      content: comment.content,
      author_type: comment.author_type,
      memberAuthor: comment.memberAuthor
        ? {
            id: comment.memberAuthor.id,
            username: comment.memberAuthor.username,
            display_name: comment.memberAuthor.display_name ?? null,
            profile_picture_url:
              comment.memberAuthor.profile_picture_url ?? null,
          }
        : null,
      moderatorAuthor: comment.moderatorAuthor
        ? {
            id: comment.moderatorAuthor.id,
            username: comment.moderatorAuthor.username,
            display_name: comment.moderatorAuthor.display_name,
            profile_picture_url: comment.moderatorAuthor.profile_picture_url,
            email_verified: comment.moderatorAuthor.email_verified,
            status: comment.moderatorAuthor.status,
            moderation_permissions:
              comment.moderatorAuthor.moderation_permissions,
            profile_visibility: comment.moderatorAuthor.profile_visibility,
            activity_visibility: comment.moderatorAuthor.activity_visibility,
            bio: comment.moderatorAuthor.bio ?? null,
            location: comment.moderatorAuthor.location ?? null,
            website_url: comment.moderatorAuthor.website_url ?? null,
            last_login_at: comment.moderatorAuthor.last_login_at
              ? toISOStringSafe(comment.moderatorAuthor.last_login_at)
              : null,
            created_at: toISOStringSafe(comment.moderatorAuthor.created_at),
            updated_at: toISOStringSafe(comment.moderatorAuthor.updated_at),
            deleted_at: comment.moderatorAuthor.deleted_at
              ? toISOStringSafe(comment.moderatorAuthor.deleted_at)
              : null,
          }
        : null,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
    };
  }

  // Return complete report entity using the prepared timestamp
  return {
    id: created.id,
    discussion_board_member_id: created.discussion_board_member_id,
    reported_article_id: created.reported_article_id,
    reported_comment_id: created.reported_comment_id,
    reviewing_moderator_id: created.reviewing_moderator_id,
    report_reason: created.report_reason,
    report_details: created.report_details,
    status: created.status,
    resolution_notes: created.resolution_notes,
    reporter: reporterSummary,
    reportedArticle: reportedArticleSummary,
    reportedComment: reportedCommentSummary,
    reviewingModerator: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
