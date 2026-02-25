import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
    include: {
      author: true,
      discussion_board_article: {
        include: {
          discussion_board_article_author: true,
          discussion_board_section: {
            include: {
              discussion_board_sections_created_by_admin: true,
              discussion_board_sections_last_modified_by_admin: true,
              discussion_board_section_archive: true,
              discussion_board_section_statistic: true,
              audit_actions: {
                select: { id: true },
              },
              administrator_assignments: {
                select: { id: true },
              },
              moderation_logs: {
                select: { id: true },
              },
              discussion_board_section_snapshots: {
                select: { id: true },
              },
              discussion_board_section_preferences: {
                select: { id: true },
              },
              discussion_board_section_files: {
                select: { id: true, filename: true },
              },
              discussion_board_section_images: {
                select: { id: true },
              },
              discussion_board_articles: {
                select: { id: true, title: true },
              },
            },
          },
        },
      },
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      404,
    );
  }
  // Transform the Prisma result to match the expected transformer input
  const transformedComment = {
    id: comment.id,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    content: comment.content,
    author: comment.author
      ? {
          id: comment.author.id,
          display_name: comment.author.display_name,
          created_at: toISOStringSafe(comment.author.created_at),
          bio: comment.author.bio ?? null,
        }
      : null,
    article: comment.discussion_board_article
      ? {
          id: comment.discussion_board_article.id,
          created_at: toISOStringSafe(
            comment.discussion_board_article.created_at,
          ),
          status: comment.discussion_board_article.status,
          title: comment.discussion_board_article.title,
          section: comment.discussion_board_article.discussion_board_section
            ? {
                id: comment.discussion_board_article.discussion_board_section
                  .id,
                created_at: toISOStringSafe(
                  comment.discussion_board_article.discussion_board_section
                    .created_at,
                ),
                updated_at: toISOStringSafe(
                  comment.discussion_board_article.discussion_board_section
                    .updated_at,
                ),
                deleted_at: comment.discussion_board_article
                  .discussion_board_section.deleted_at
                  ? toISOStringSafe(
                      comment.discussion_board_article.discussion_board_section
                        .deleted_at,
                    )
                  : null,
                auditActions:
                  comment.discussion_board_article.discussion_board_section.audit_actions.map(
                    (act) => ({ id: act.id }),
                  ),
                administratorAssignments:
                  comment.discussion_board_article.discussion_board_section.administrator_assignments.map(
                    (assign) => ({ id: assign.id }),
                  ),
                moderationLogs:
                  comment.discussion_board_article.discussion_board_section.moderation_logs.map(
                    (log) => ({ id: log.id }),
                  ),
                name: comment.discussion_board_article.discussion_board_section
                  .name,
                description:
                  comment.discussion_board_article.discussion_board_section
                    .description,
                status:
                  comment.discussion_board_article.discussion_board_section
                    .status,
                display_order:
                  comment.discussion_board_article.discussion_board_section
                    .display_order,
                createdByAdmin: comment.discussion_board_article
                  .discussion_board_section
                  .discussion_board_sections_created_by_admin
                  ? {
                      id: comment.discussion_board_article
                        .discussion_board_section
                        .discussion_board_sections_created_by_admin.id,
                    }
                  : null,
                lastModifiedByAdmin: comment.discussion_board_article
                  .discussion_board_section
                  .discussion_board_sections_last_modified_by_admin
                  ? {
                      id: comment.discussion_board_article
                        .discussion_board_section
                        .discussion_board_sections_last_modified_by_admin.id,
                    }
                  : null,
                snapshots:
                  comment.discussion_board_article.discussion_board_section.discussion_board_section_snapshots.map(
                    (snap) => ({ id: snap.id }),
                  ),
                statistic: comment.discussion_board_article
                  .discussion_board_section.discussion_board_section_statistic
                  ? {
                      id: comment.discussion_board_article
                        .discussion_board_section
                        .discussion_board_section_statistic.id,
                      view_count:
                        comment.discussion_board_article
                          .discussion_board_section
                          .discussion_board_section_statistic.view_count,
                    }
                  : null,
                preferences:
                  comment.discussion_board_article.discussion_board_section.discussion_board_section_preferences.map(
                    (pref) => ({ id: pref.id }),
                  ),
                archive: comment.discussion_board_article
                  .discussion_board_section.discussion_board_section_archive
                  ? {
                      id: comment.discussion_board_article
                        .discussion_board_section
                        .discussion_board_section_archive.id,
                      archived_at: toISOStringSafe(
                        comment.discussion_board_article
                          .discussion_board_section
                          .discussion_board_section_archive.archived_at,
                      ),
                    }
                  : null,
                files:
                  comment.discussion_board_article.discussion_board_section.discussion_board_section_files.map(
                    (file) => ({ id: file.id, filename: file.filename }),
                  ),
                images:
                  comment.discussion_board_article.discussion_board_section.discussion_board_section_images.map(
                    (img) => ({ id: img.id }),
                  ),
                articles:
                  comment.discussion_board_article.discussion_board_section.discussion_board_articles.map(
                    (art) => ({ id: art.id, title: art.title }),
                  ),
              }
            : null,
          author: comment.discussion_board_article
            .discussion_board_article_author
            ? {
                id: comment.discussion_board_article
                  .discussion_board_article_author.id,
                display_name:
                  comment.discussion_board_article
                    .discussion_board_article_author.display_name,
                created_at: toISOStringSafe(
                  comment.discussion_board_article
                    .discussion_board_article_author.created_at,
                ),
                bio:
                  comment.discussion_board_article
                    .discussion_board_article_author.bio ?? null,
              }
            : null,
        }
      : null,
  };
  return await DiscussionBoardCommentTransformer.transform(transformedComment);
}
