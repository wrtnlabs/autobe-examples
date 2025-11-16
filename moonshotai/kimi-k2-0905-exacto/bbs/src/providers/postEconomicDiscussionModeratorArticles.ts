import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postEconomicDiscussionModeratorArticles(props: {
  moderator: ModeratorPayload;
  body: IEconomicDiscussionArticle.ICreate;
}): Promise<IEconomicDiscussionArticle> {
  const article = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create the main article
    const createdArticle = await tx.economic_discussion_articles.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        title: props.body.title,
        content: props.body.content,
        status: "pending",
        version: 1,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        economic_discussion_moderator_id: props.moderator.id,
      },
    });

    // Create category associations
    for (const categoryId of props.body.category_ids) {
      await tx.economic_discussion_article_categories.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          economic_discussion_article_id: createdArticle.id,
          economic_discussion_category_id: categoryId,
          created_at: new Date(),
        },
      });
    }

    // Handle attachments if provided
    if (props.body.attachments?.length) {
      for (const attachment of props.body.attachments) {
        await tx.economic_discussion_attachments.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            economic_discussion_article_id: createdArticle.id,
            filename: attachment.filename,
            file_path: `/uploads/articles/${createdArticle.id}/${attachment.filename}`,
            file_size: attachment.file_size,
            file_type: attachment.file_type,
            mime_type: attachment.mime_type,
            uploaded_at: new Date(),
            is_scanned: false,
          },
        });
      }
    }

    return createdArticle;
  });

  // Fetch the moderator details
  const moderator =
    await MyGlobal.prisma.economic_discussion_moderators.findUnique({
      where: { id: props.moderator.id },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Fetch categories for the response
  const categories =
    await MyGlobal.prisma.economic_discussion_categories.findMany({
      where: {
        id: { in: props.body.category_ids },
      },
    });

  // Return converted article
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    view_count: article.view_count,
    version: article.version,
    status: article.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
    member_author: null,
    moderator_author: article.economic_discussion_moderator_id,
    member_author_profile: undefined,
    moderator_author_profile: {
      id: moderator.id,
      username: moderator.username,
      moderation_level: moderator.moderation_level as
        | "standard"
        | "senior"
        | "admin",
      created_at: toISOStringSafe(moderator.created_at),
    },
    categories: categories.map((cat) => ({
      id: cat.id,
      code: cat.code,
      name: cat.name,
      display_order: cat.display_order,
      is_active: cat.is_active,
      article_count: cat.article_count,
    })),
  };
}
