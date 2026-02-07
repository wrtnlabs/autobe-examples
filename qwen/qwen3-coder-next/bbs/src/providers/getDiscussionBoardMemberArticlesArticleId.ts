import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      author: true,
      section: true,
      files: true,
      images: true,
      articleTags: {
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
    title: article.title,
    content: article.content,
    author_id: article.author_id,
    section_id: article.section_id,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
    author: {
      id: article.author.id,
      email: article.author.email,
      display_name: article.author.display_name,
      bio: article.author.bio ?? null,
      created_at: toISOStringSafe(article.author.created_at),
      updated_at: toISOStringSafe(article.author.updated_at),
      deleted_at: article.author.deleted_at
        ? toISOStringSafe(article.author.deleted_at)
        : null,
    },
    section: {
      id: article.section.id,
      name: article.section.name,
      description: article.section.description ?? null,
      created_at: toISOStringSafe(article.section.created_at),
      updated_at: toISOStringSafe(article.section.updated_at),
      deleted_at: article.section.deleted_at
        ? toISOStringSafe(article.section.deleted_at)
        : null,
    },
    files: article.files.map((file) => ({
      id: file.id,
      article_id: file.discussion_board_article_id,
      original_name: file.original_name,
      stored_path: file.stored_path,
      file_type: file.file_type,
      file_size: file.file_size,
      created_at: toISOStringSafe(file.created_at),
      updated_at: toISOStringSafe(file.updated_at),
      deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
    })),
    images: article.images.map((image) => ({
      id: image.id,
      article_id: image.discussion_board_article_id,
      original_filename: image.original_filename,
      stored_filename: image.stored_filename,
      mime_type: image.mime_type,
      size: image.size,
      width: image.width,
      height: image.height,
      display_order: image.display_order,
    })),
    tags: article.articleTags.map((tagRel) => ({
      id: tagRel.tag.id,
      name: tagRel.tag.name,
      created_at: toISOStringSafe(tagRel.tag.created_at),
    })),
  };
}
