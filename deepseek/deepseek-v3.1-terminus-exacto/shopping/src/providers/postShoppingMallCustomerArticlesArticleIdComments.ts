import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function postShoppingMallCustomerArticlesArticleIdComments(props: {
  customer: CustomerPayload;
  articleId: string & tags.Format<"uuid">;
  body: IShoppingMallArticleComment.ICreate;
}): Promise<IShoppingMallArticleComment> {
  // Verify article exists and allows comments
  const article = await MyGlobal.prisma.shopping_mall_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
      status: "published",
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (!article.allow_comments) {
    throw new HttpException("Comments are not allowed on this article", 403);
  }

  // Validate parent comment if provided
  let parentDepth = 0;
  let parentId: string | null = null;

  if (props.body.parent) {
    const parentComment =
      await MyGlobal.prisma.shopping_mall_article_comments.findFirst({
        where: {
          id: props.body.parent.id,
          shopping_mall_article_id: props.articleId,
          deleted_at: null,
          status: "approved",
        },
      });

    if (!parentComment) {
      throw new HttpException("Parent comment not found or not approved", 404);
    }

    parentDepth = parentComment.depth;
    parentId = parentComment.id;
  }

  // Calculate depth (parent depth + 1, or 0 for root comments)
  const depth = props.body.parent ? parentDepth + 1 : 0;

  // Create the comment
  const created = await MyGlobal.prisma.shopping_mall_article_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_article_id: props.articleId,
      parent_id: parentId,
      actor_type: props.body.actor_type,
      content: props.body.content,
      status: "pending",
      like_count: 0,
      report_count: 0,
      depth: depth,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Fetch the created comment with relationships
  const commentWithRelations =
    await MyGlobal.prisma.shopping_mall_article_comments.findFirst({
      where: { id: created.id },
      include: {
        article: {
          include: {
            channel: true,
            section: true,
          },
        },
        parent: {
          include: {
            article: {
              include: {
                channel: true,
                section: true,
              },
            },
          },
        },
      },
    });

  if (!commentWithRelations) {
    throw new HttpException("Failed to retrieve created comment", 500);
  }

  // Transform to API response format
  return {
    id: commentWithRelations.id,
    content: commentWithRelations.content,
    status: commentWithRelations.status as
      | "pending"
      | "approved"
      | "rejected"
      | "flagged",
    like_count: commentWithRelations.like_count,
    report_count: commentWithRelations.report_count,
    depth: commentWithRelations.depth,
    actor_type: commentWithRelations.actor_type as
      | "customer"
      | "seller"
      | "administrator",
    created_at: toISOStringSafe(commentWithRelations.created_at),
    updated_at: toISOStringSafe(commentWithRelations.updated_at),
    deleted_at: commentWithRelations.deleted_at
      ? toISOStringSafe(commentWithRelations.deleted_at)
      : undefined,
    shopping_mall_article_id: commentWithRelations.shopping_mall_article_id,
    article: {
      id: commentWithRelations.article.id,
      title: commentWithRelations.article.title,
      subtitle: commentWithRelations.article.subtitle || undefined,
      summary: commentWithRelations.article.summary || undefined,
      status: commentWithRelations.article.status,
      business_status: commentWithRelations.article.business_status,
      featured: commentWithRelations.article.featured,
      allow_comments: commentWithRelations.article.allow_comments,
      view_count: commentWithRelations.article.view_count,
      published_at: commentWithRelations.article.published_at
        ? toISOStringSafe(commentWithRelations.article.published_at)
        : undefined,
      created_at: toISOStringSafe(commentWithRelations.article.created_at),
      updated_at: toISOStringSafe(commentWithRelations.article.updated_at),
      channel: {
        id: commentWithRelations.article.channel.id,
        name: commentWithRelations.article.channel.name,
        description:
          commentWithRelations.article.channel.description || undefined,
        code: commentWithRelations.article.channel.code,
      },
      section: commentWithRelations.article.section
        ? {
            id: commentWithRelations.article.section.id,
            name: commentWithRelations.article.section.name,
            description:
              commentWithRelations.article.section.description || undefined,
            display_order: commentWithRelations.article.section.display_order,
          }
        : undefined,
    },
    parent: commentWithRelations.parent
      ? {
          id: commentWithRelations.parent.id,
          content: commentWithRelations.parent.content,
          status: commentWithRelations.parent.status as
            | "pending"
            | "approved"
            | "rejected"
            | "flagged",
          like_count: commentWithRelations.parent.like_count,
          report_count: commentWithRelations.parent.report_count,
          depth: commentWithRelations.parent.depth,
          actor_type: commentWithRelations.parent.actor_type as
            | "customer"
            | "seller"
            | "administrator",
          article: {
            id: commentWithRelations.parent.article.id,
            title: commentWithRelations.parent.article.title,
            subtitle: commentWithRelations.parent.article.subtitle || undefined,
            summary: commentWithRelations.parent.article.summary || undefined,
            status: commentWithRelations.parent.article.status,
            business_status:
              commentWithRelations.parent.article.business_status,
            featured: commentWithRelations.parent.article.featured,
            allow_comments: commentWithRelations.parent.article.allow_comments,
            view_count: commentWithRelations.parent.article.view_count,
            published_at: commentWithRelations.parent.article.published_at
              ? toISOStringSafe(
                  commentWithRelations.parent.article.published_at,
                )
              : undefined,
            created_at: toISOStringSafe(
              commentWithRelations.parent.article.created_at,
            ),
            updated_at: toISOStringSafe(
              commentWithRelations.parent.article.updated_at,
            ),
            channel: {
              id: commentWithRelations.parent.article.channel.id,
              name: commentWithRelations.parent.article.channel.name,
              description:
                commentWithRelations.parent.article.channel.description ||
                undefined,
              code: commentWithRelations.parent.article.channel.code,
            },
            section: commentWithRelations.parent.article.section
              ? {
                  id: commentWithRelations.parent.article.section.id,
                  name: commentWithRelations.parent.article.section.name,
                  description:
                    commentWithRelations.parent.article.section.description ||
                    undefined,
                  display_order:
                    commentWithRelations.parent.article.section.display_order,
                }
              : undefined,
          },
        }
      : undefined,
  };
}
