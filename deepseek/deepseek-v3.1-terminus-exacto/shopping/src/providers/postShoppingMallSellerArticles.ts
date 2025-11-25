import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerArticles(props: {
  seller: SellerPayload;
  body: IShoppingMallArticle.ICreate;
}): Promise<IShoppingMallArticle> {
  // Validate actor_type matches seller
  if (props.body.actor_type !== "seller") {
    throw new HttpException("Invalid actor type for seller", 400);
  }

  // Verify channel exists
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { id: props.body.channel_id },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  // Verify section exists if provided
  let section = null;
  if (props.body.section_id) {
    section = await MyGlobal.prisma.shopping_mall_sections.findUnique({
      where: { id: props.body.section_id },
    });

    if (!section) {
      throw new HttpException("Section not found", 404);
    }
  }

  // Check for duplicate title in the same channel
  const existingArticle =
    await MyGlobal.prisma.shopping_mall_articles.findFirst({
      where: {
        shopping_mall_channel_id: props.body.channel_id,
        title: props.body.title,
        deleted_at: null,
      },
    });

  if (existingArticle) {
    throw new HttpException(
      "Article with this title already exists in the channel",
      409,
    );
  }

  const now = toISOStringSafe(new Date());

  const article = await MyGlobal.prisma.shopping_mall_articles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: props.body.actor_type,
      title: props.body.title,
      subtitle: props.body.subtitle ?? null,
      content: props.body.content,
      summary: props.body.summary ?? null,
      status: "draft",
      business_status: "pending_review",
      view_count: 0,
      like_count: 0,
      share_count: 0,
      featured: props.body.featured ?? false,
      allow_comments: props.body.allow_comments ?? true,
      published_at: null,
      shopping_mall_channel_id: props.body.channel_id,
      shopping_mall_section_id: props.body.section_id ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      channel: true,
      section: true,
    },
  });

  return {
    id: article.id,
    actor_type: article.actor_type,
    title: article.title,
    subtitle: article.subtitle ?? undefined,
    content: article.content,
    summary: article.summary ?? undefined,
    status: article.status,
    business_status: article.business_status,
    view_count: article.view_count,
    like_count: article.like_count,
    share_count: article.share_count,
    featured: article.featured,
    allow_comments: article.allow_comments,
    published_at: article.published_at
      ? toISOStringSafe(article.published_at)
      : undefined,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at
      ? toISOStringSafe(article.deleted_at)
      : undefined,
    channel: {
      id: article.channel.id,
      name: article.channel.name,
      description: article.channel.description ?? undefined,
      code: article.channel.code,
    },
    section: article.section
      ? {
          id: article.section.id,
          name: article.section.name,
          description: article.section.description ?? undefined,
          display_order: article.section.display_order,
        }
      : undefined,
  };
}
