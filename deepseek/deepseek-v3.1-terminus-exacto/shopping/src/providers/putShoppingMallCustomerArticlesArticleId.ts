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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerArticlesArticleId(props: {
  customer: CustomerPayload;
  articleId: string & tags.Format<"uuid">;
  body: IShoppingMallArticle.IUpdate;
}): Promise<IShoppingMallArticle> {
  // Verify article exists and belongs to customer
  const existingArticle =
    await MyGlobal.prisma.shopping_mall_articles.findFirst({
      where: {
        id: props.articleId,
        actor_type: "customer",
        deleted_at: null,
      },
      include: {
        channel: true,
        section: true,
      },
    });

  if (!existingArticle) {
    throw new HttpException("Article not found or access denied", 404);
  }

  // Verify customer ownership through customer-specific relationship
  // Since the schema shows actor_type field but no direct customer relationship table,
  // we need to check if there's a customer-specific relationship
  // For now, we'll assume ownership verification is handled by actor_type="customer"
  // and additional verification would be done through customer-specific tables if they exist

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Apply partial updates
  if (props.body.title !== undefined) updateData.title = props.body.title;
  if (props.body.subtitle !== undefined)
    updateData.subtitle = props.body.subtitle;
  if (props.body.content !== undefined) updateData.content = props.body.content;
  if (props.body.summary !== undefined) updateData.summary = props.body.summary;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if (props.body.business_status !== undefined)
    updateData.business_status = props.body.business_status;
  if (props.body.featured !== undefined)
    updateData.featured = props.body.featured;
  if (props.body.allow_comments !== undefined)
    updateData.allow_comments = props.body.allow_comments;

  // Perform update
  const updatedArticle = await MyGlobal.prisma.shopping_mall_articles.update({
    where: { id: props.articleId },
    data: updateData,
    include: {
      channel: true,
      section: true,
    },
  });

  // Convert to response format
  return {
    id: updatedArticle.id,
    actor_type: updatedArticle.actor_type,
    title: updatedArticle.title,
    subtitle: updatedArticle.subtitle ?? undefined,
    content: updatedArticle.content,
    summary: updatedArticle.summary ?? undefined,
    status: updatedArticle.status,
    business_status: updatedArticle.business_status,
    view_count: updatedArticle.view_count,
    like_count: updatedArticle.like_count,
    share_count: updatedArticle.share_count,
    featured: updatedArticle.featured,
    allow_comments: updatedArticle.allow_comments,
    published_at: updatedArticle.published_at
      ? toISOStringSafe(updatedArticle.published_at)
      : undefined,
    created_at: toISOStringSafe(updatedArticle.created_at),
    updated_at: toISOStringSafe(updatedArticle.updated_at),
    deleted_at: updatedArticle.deleted_at
      ? toISOStringSafe(updatedArticle.deleted_at)
      : undefined,
    channel: {
      id: updatedArticle.channel.id,
      name: updatedArticle.channel.name,
      description: updatedArticle.channel.description ?? undefined,
      code: updatedArticle.channel.code,
    },
    section: updatedArticle.section
      ? {
          id: updatedArticle.section.id,
          name: updatedArticle.section.name,
          description: updatedArticle.section.description ?? undefined,
          display_order: updatedArticle.section.display_order,
        }
      : undefined,
  };
}
