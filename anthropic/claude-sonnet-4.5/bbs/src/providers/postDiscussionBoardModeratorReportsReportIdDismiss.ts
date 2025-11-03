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

export async function postDiscussionBoardModeratorReportsReportIdDismiss(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.IDismiss;
}): Promise<IDiscussionBoardReport> {
  const { moderator, reportId, body } = props;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_reports.update({
    where: { id: reportId },
    data: {
      status: "dismissed",
      reviewing_moderator_id: moderator.id,
      resolution_notes: body.resolution_notes,
      updated_at: now,
    },
  });

  const report =
    await MyGlobal.prisma.discussion_board_reports.findUniqueOrThrow({
      where: { id: reportId },
    });

  const reporter =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: report.discussion_board_member_id },
    });

  let reportedArticle: IDiscussionBoardArticle.ISummary | null = null;
  if (report.reported_article_id) {
    const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: report.reported_article_id },
    });

    if (article) {
      const author =
        await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
          where: { id: article.discussion_board_member_id },
        });

      const articleCategories =
        await MyGlobal.prisma.discussion_board_article_categories.findMany({
          where: { discussion_board_article_id: article.id },
        });

      const categoryIds = articleCategories.map(
        (ac) => ac.discussion_board_category_id,
      );
      const categories =
        await MyGlobal.prisma.discussion_board_categories.findMany({
          where: { id: { in: categoryIds } },
        });

      const articleTags =
        await MyGlobal.prisma.discussion_board_article_tags.findMany({
          where: { discussion_board_article_id: article.id },
        });

      const tagIds = articleTags.map((at) => at.discussion_board_tag_id);
      const tags = await MyGlobal.prisma.discussion_board_tags.findMany({
        where: { id: { in: tagIds } },
      });

      reportedArticle = {
        id: article.id,
        title: article.title,
        summary: article.summary,
        status: article.status,
        view_count: article.view_count,
        comment_count: article.comment_count,
        author: {
          id: author.id,
          username: author.username,
          display_name: author.display_name ?? undefined,
          profile_picture_url: author.profile_picture_url ?? undefined,
        },
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description ?? undefined,
          created_at: toISOStringSafe(c.created_at),
          updated_at: toISOStringSafe(c.updated_at),
        })),
        tags: tags.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          created_at: toISOStringSafe(t.created_at),
          updated_at: toISOStringSafe(t.updated_at),
        })),
        created_at: toISOStringSafe(article.created_at),
        updated_at: toISOStringSafe(article.updated_at),
        deleted_at: article.deleted_at
          ? toISOStringSafe(article.deleted_at)
          : null,
      };
    }
  }

  let reportedComment: IDiscussionBoardComment.ISummary | null = null;
  if (report.reported_comment_id) {
    const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: report.reported_comment_id },
    });

    if (comment) {
      let memberAuthor: IDiscussionBoardMember.ISummary | null = null;
      if (comment.discussion_board_member_id) {
        const member =
          await MyGlobal.prisma.discussion_board_members.findUnique({
            where: { id: comment.discussion_board_member_id },
          });
        if (member) {
          memberAuthor = {
            id: member.id,
            username: member.username,
            display_name: member.display_name ?? undefined,
            profile_picture_url: member.profile_picture_url ?? undefined,
          };
        }
      }

      let moderatorAuthor: IDiscussionBoardModerator.ISummary | null = null;
      if (comment.discussion_board_moderator_id) {
        const mod =
          await MyGlobal.prisma.discussion_board_moderators.findUnique({
            where: { id: comment.discussion_board_moderator_id },
          });
        if (mod) {
          moderatorAuthor = {
            id: mod.id,
            username: mod.username,
            display_name: mod.display_name,
            profile_picture_url: mod.profile_picture_url ?? null,
            email_verified: mod.email_verified,
            status: mod.status,
            moderation_permissions: mod.moderation_permissions,
            profile_visibility: mod.profile_visibility,
            activity_visibility: mod.activity_visibility,
            bio: mod.bio ?? undefined,
            location: mod.location ?? undefined,
            website_url: mod.website_url ?? undefined,
            last_login_at: mod.last_login_at
              ? toISOStringSafe(mod.last_login_at)
              : undefined,
            created_at: toISOStringSafe(mod.created_at),
            updated_at: toISOStringSafe(mod.updated_at),
            deleted_at: mod.deleted_at
              ? toISOStringSafe(mod.deleted_at)
              : undefined,
          };
        }
      }

      reportedComment = {
        id: comment.id,
        content: comment.content,
        author_type: comment.author_type,
        memberAuthor,
        moderatorAuthor,
        created_at: toISOStringSafe(comment.created_at),
        updated_at: toISOStringSafe(comment.updated_at),
      };
    }
  }

  let reviewingModerator: IDiscussionBoardModerator.ISummary | null = null;
  if (report.reviewing_moderator_id) {
    const mod = await MyGlobal.prisma.discussion_board_moderators.findUnique({
      where: { id: report.reviewing_moderator_id },
    });
    if (mod) {
      reviewingModerator = {
        id: mod.id,
        username: mod.username,
        display_name: mod.display_name,
        profile_picture_url: mod.profile_picture_url ?? null,
        email_verified: mod.email_verified,
        status: mod.status,
        moderation_permissions: mod.moderation_permissions,
        profile_visibility: mod.profile_visibility,
        activity_visibility: mod.activity_visibility,
        bio: mod.bio ?? undefined,
        location: mod.location ?? undefined,
        website_url: mod.website_url ?? undefined,
        last_login_at: mod.last_login_at
          ? toISOStringSafe(mod.last_login_at)
          : undefined,
        created_at: toISOStringSafe(mod.created_at),
        updated_at: toISOStringSafe(mod.updated_at),
        deleted_at: mod.deleted_at
          ? toISOStringSafe(mod.deleted_at)
          : undefined,
      };
    }
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
      id: reporter.id,
      username: reporter.username,
      display_name: reporter.display_name ?? undefined,
      profile_picture_url: reporter.profile_picture_url ?? undefined,
    },
    reportedArticle,
    reportedComment,
    reviewingModerator,
    created_at: toISOStringSafe(report.created_at),
    updated_at: now,
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
