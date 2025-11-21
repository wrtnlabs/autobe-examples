import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerArticlesArticleIdCommentsCommentId(props: {
  customer: CustomerPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallArticleComment> {
  // First verify the comment exists and belongs to the specified article
  const comment =
    await MyGlobal.prisma.shopping_mall_article_comments.findUnique({
      where: {
        id: props.commentId,
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            summary: true,
            status: true,
            business_status: true,
            featured: true,
            allow_comments: true,
            view_count: true,
            published_at: true,
            created_at: true,
            updated_at: true,
            channel: {
              select: {
                id: true,
                name: true,
                description: true,
                code: true,
              },
            },
            section: {
              select: {
                id: true,
                name: true,
                description: true,
                display_order: true,
              },
            },
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            status: true,
            like_count: true,
            report_count: true,
            depth: true,
            actor_type: true,
            article: {
              select: {
                id: true,
                title: true,
                subtitle: true,
                summary: true,
                status: true,
                business_status: true,
                featured: true,
                allow_comments: true,
                view_count: true,
                published_at: true,
                created_at: true,
                updated_at: true,
                channel: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    code: true,
                  },
                },
                section: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    display_order: true,
                  },
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

  // Verify the comment belongs to the specified article
  if (comment.shopping_mall_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }

  // Verify the comment belongs to the authenticated customer
  if (comment.actor_type !== "customer") {
    throw new HttpException("You can only delete customer comments", 403);
  }

  // Check if this comment has child comments
  const childComments =
    await MyGlobal.prisma.shopping_mall_article_comments.count({
      where: {
        parent_id: props.commentId,
        deleted_at: null,
      },
    });

  if (childComments > 0) {
    throw new HttpException("Cannot delete comment with child comments", 400);
  }

  // Delete the comment
  const deletedComment =
    await MyGlobal.prisma.shopping_mall_article_comments.delete({
      where: {
        id: props.commentId,
      },
    });

  // Build article summary if available
  const articleSummary = comment.article
    ? {
        id: comment.article.id,
        title: comment.article.title,
        subtitle: comment.article.subtitle ?? undefined,
        summary: comment.article.summary ?? undefined,
        status: comment.article.status,
        business_status: comment.article.business_status,
        featured: comment.article.featured,
        allow_comments: comment.article.allow_comments,
        view_count: comment.article.view_count,
        published_at: comment.article.published_at
          ? toISOStringSafe(comment.article.published_at)
          : undefined,
        created_at: toISOStringSafe(comment.article.created_at),
        updated_at: toISOStringSafe(comment.article.updated_at),
        channel: {
          id: comment.article.channel.id,
          name: comment.article.channel.name,
          description: comment.article.channel.description ?? undefined,
          code: comment.article.channel.code,
        },
        section: comment.article.section
          ? {
              id: comment.article.section.id,
              name: comment.article.section.name,
              description: comment.article.section.description ?? undefined,
              display_order: comment.article.section.display_order,
            }
          : undefined,
      }
    : undefined;

  // Build parent comment summary if available
  const parentSummary = comment.parent
    ? {
        id: comment.parent.id,
        content: comment.parent.content,
        status: comment.parent.status as
          | "pending"
          | "approved"
          | "rejected"
          | "flagged",
        like_count: comment.parent.like_count,
        report_count: comment.parent.report_count,
        depth: comment.parent.depth,
        actor_type: comment.parent.actor_type as
          | "customer"
          | "seller"
          | "administrator",
        article: comment.parent.article
          ? {
              id: comment.parent.article.id,
              title: comment.parent.article.title,
              subtitle: comment.parent.article.subtitle ?? undefined,
              summary: comment.parent.article.summary ?? undefined,
              status: comment.parent.article.status,
              business_status: comment.parent.article.business_status,
              featured: comment.parent.article.featured,
              allow_comments: comment.parent.article.allow_comments,
              view_count: comment.parent.article.view_count,
              published_at: comment.parent.article.published_at
                ? toISOStringSafe(comment.parent.article.published_at)
                : undefined,
              created_at: toISOStringSafe(comment.parent.article.created_at),
              updated_at: toISOStringSafe(comment.parent.article.updated_at),
              channel: {
                id: comment.parent.article.channel.id,
                name: comment.parent.article.channel.name,
                description:
                  comment.parent.article.channel.description ?? undefined,
                code: comment.parent.article.channel.code,
              },
              section: comment.parent.article.section
                ? {
                    id: comment.parent.article.section.id,
                    name: comment.parent.article.section.name,
                    description:
                      comment.parent.article.section.description ?? undefined,
                    display_order: comment.parent.article.section.display_order,
                  }
                : undefined,
            }
          : undefined,
      }
    : undefined;

  return {
    id: deletedComment.id,
    content: deletedComment.content,
    status: deletedComment.status as
      | "pending"
      | "approved"
      | "rejected"
      | "flagged",
    like_count: deletedComment.like_count,
    report_count: deletedComment.report_count,
    depth: deletedComment.depth,
    actor_type: deletedComment.actor_type as
      | "customer"
      | "seller"
      | "administrator",
    created_at: toISOStringSafe(deletedComment.created_at),
    updated_at: toISOStringSafe(deletedComment.updated_at),
    deleted_at: deletedComment.deleted_at
      ? toISOStringSafe(deletedComment.deleted_at)
      : undefined,
    shopping_mall_article_id: deletedComment.shopping_mall_article_id,
    article: articleSummary,
    parent: parentSummary,
  };
}
