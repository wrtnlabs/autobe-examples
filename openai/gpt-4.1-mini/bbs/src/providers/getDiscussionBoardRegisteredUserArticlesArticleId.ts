import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserArticlesArticleId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      author: true,
      files: {
        where: { deleted_at: null },
        orderBy: { display_order: "asc" },
      },
      images: {
        where: { deleted_at: null },
        orderBy: { display_order: "asc" },
      },
      tagMappings: {
        where: { deleted_at: null },
        include: {
          tag: true,
        },
      },
    },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  return {
    id: article.id,
    registered_user_id: article.registered_user_id,
    section_id: article.section_id,
    title: article.title,
    content: article.content,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at:
      article.deleted_at === null ? null : toISOStringSafe(article.deleted_at),
    author: {
      id: article.author.id,
      email: article.author.email,
      display_name: article.author.display_name,
      bio: article.author.bio === null ? undefined : article.author.bio,
      is_banned: article.author.is_banned,
      created_at: toISOStringSafe(article.author.created_at),
      updated_at: toISOStringSafe(article.author.updated_at),
      deleted_at:
        article.author.deleted_at === null
          ? null
          : toISOStringSafe(article.author.deleted_at),
    },
    files: article.files.map((file) => ({
      id: file.id,
      article_id: file.article_id,
      file_name: file.file_name,
      file_type: file.file_type,
      file_size: file.file_size,
      download_url: file.download_url,
      display_order: file.display_order,
      created_at: toISOStringSafe(file.created_at),
      updated_at: toISOStringSafe(file.updated_at),
      deleted_at:
        file.deleted_at === null ? null : toISOStringSafe(file.deleted_at),
    })),
    images: article.images.map((image) => ({
      id: image.id,
      discussion_board_article_id: image.discussion_board_article_id,
      image_url: image.image_url,
      description: image.description === null ? undefined : image.description,
      display_order: image.display_order,
      created_at: toISOStringSafe(image.created_at),
      updated_at: toISOStringSafe(image.updated_at),
      deleted_at:
        image.deleted_at === null ? null : toISOStringSafe(image.deleted_at),
    })),
    tags: article.tagMappings.map((mapping) => mapping.tag.name),
  };
}
