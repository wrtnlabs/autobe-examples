import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IShoppingMallArticle.IUpdate;
}): Promise<IShoppingMallArticle> {
  // Verify the article exists and is not deleted
  const article = await MyGlobal.prisma.shopping_mall_articles.findUnique({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    include: {
      channel: true,
      section: true,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Update only provided fields with proper type safety
  const updated = await MyGlobal.prisma.shopping_mall_articles.update({
    where: { id: props.articleId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.subtitle !== undefined && {
        subtitle: props.body.subtitle,
      }),
      ...(props.body.content !== undefined && { content: props.body.content }),
      ...(props.body.summary !== undefined && { summary: props.body.summary }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.business_status !== undefined && {
        business_status: props.body.business_status,
      }),
      ...(props.body.featured !== undefined && {
        featured: props.body.featured,
      }),
      ...(props.body.allow_comments !== undefined && {
        allow_comments: props.body.allow_comments,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      channel: true,
      section: true,
    },
  });

  // Convert to API response format with proper null/undefined handling
  return {
    id: updated.id,
    actor_type: updated.actor_type,
    title: updated.title,
    subtitle: updated.subtitle ?? undefined,
    content: updated.content,
    summary: updated.summary ?? undefined,
    status: updated.status,
    business_status: updated.business_status,
    view_count: updated.view_count,
    like_count: updated.like_count,
    share_count: updated.share_count,
    featured: updated.featured,
    allow_comments: updated.allow_comments,
    published_at: updated.published_at
      ? toISOStringSafe(updated.published_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    channel: {
      id: updated.channel.id,
      name: updated.channel.name,
      description: updated.channel.description ?? undefined,
      code: updated.channel.code,
    },
    section: updated.section
      ? {
          id: updated.section.id,
          name: updated.section.name,
          description: updated.section.description ?? undefined,
          display_order: updated.section.display_order,
        }
      : undefined,
  };
}
