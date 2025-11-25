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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminArticles(props: {
  admin: AdminPayload;
  body: IShoppingMallArticle.ICreate;
}): Promise<IShoppingMallArticle> {
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

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_articles.create({
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
  });

  return {
    id: created.id,
    actor_type: created.actor_type,
    title: created.title,
    subtitle: created.subtitle ?? undefined,
    content: created.content,
    summary: created.summary ?? undefined,
    status: created.status,
    business_status: created.business_status,
    view_count: created.view_count,
    like_count: created.like_count,
    share_count: created.share_count,
    featured: created.featured,
    allow_comments: created.allow_comments,
    published_at: created.published_at
      ? toISOStringSafe(created.published_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    channel: {
      id: channel.id,
      name: channel.name,
      description: channel.description ?? undefined,
      code: channel.code,
    },
    section: section
      ? {
          id: section.id,
          name: section.name,
          description: section.description ?? undefined,
          display_order: section.display_order,
        }
      : undefined,
  };
}
