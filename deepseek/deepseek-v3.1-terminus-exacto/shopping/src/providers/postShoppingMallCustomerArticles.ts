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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerArticles(props: {
  customer: CustomerPayload;
  body: IShoppingMallArticle.ICreate;
}): Promise<IShoppingMallArticle> {
  // Validate actor_type matches customer
  if (props.body.actor_type !== "customer") {
    throw new HttpException("Invalid actor type for customer", 400);
  }

  // Validate that the referenced channel exists
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { id: props.body.channel_id },
  });

  if (!channel) {
    throw new HttpException("Referenced channel does not exist", 404);
  }

  // Validate section exists if provided
  if (props.body.section_id) {
    const section = await MyGlobal.prisma.shopping_mall_sections.findUnique({
      where: { id: props.body.section_id },
    });

    if (!section) {
      throw new HttpException("Referenced section does not exist", 404);
    }
  }

  const now = toISOStringSafe(new Date());
  const articleId = v4();

  try {
    const created = await MyGlobal.prisma.shopping_mall_articles.create({
      data: {
        id: articleId,
        actor_type: props.body.actor_type,
        title: props.body.title,
        subtitle: props.body.section_id ? (props.body.subtitle ?? null) : null,
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
        created_at: now,
        updated_at: now,
        deleted_at: null,
        shopping_mall_channel_id: props.body.channel_id,
        shopping_mall_section_id: props.body.section_id ?? null,
      },
      include: {
        channel: true,
        section: true,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
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
        id: created.channel.id as string & tags.Format<"uuid">,
        name: created.channel.name,
        description: created.channel.description ?? undefined,
        code: created.channel.code,
      },
      section: created.section
        ? {
            id: created.section.id as string & tags.Format<"uuid">,
            name: created.section.name,
            description: created.section.description ?? undefined,
            display_order: created.section.display_order,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "Article with this title already exists in the channel",
          409,
        );
      }
    }
    throw new HttpException("Failed to create article", 500);
  }
}
