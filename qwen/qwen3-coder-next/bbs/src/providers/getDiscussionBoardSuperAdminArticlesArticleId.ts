import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminArticlesArticleId(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: {
      id: true,
      author_id: true,
      section_id: true,
      title: true,
      content: true,
      view_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
          email: true,
          display_name: true,
        },
      },
      files: {
        select: {
          id: true,
          discussion_board_article_id: true,
          original_name: true,
          stored_path: true,
          file_type: true,
          file_size: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      images: {
        select: {
          id: true,
          discussion_board_article_id: true,
          original_filename: true,
          stored_filename: true,
          mime_type: true,
          size: true,
          width: true,
          height: true,
          display_order: true,
        },
      },
      articleTags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  return {
    id: article.id,
    author_id: article.author_id,
    section_id: article.section_id,
    title: article.title,
    content: article.content,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
    author: {
      id: article.author.id,
      email: article.author.email,
      display_name: article.author.display_name,
    },
    files: article.files.map((file) => ({
      id: file.id,
      discussion_board_article_id: file.discussion_board_article_id,
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
      discussion_board_article_id: image.discussion_board_article_id,
      original_filename: image.original_filename,
      stored_filename: image.stored_filename,
      mime_type: image.mime_type,
      size: image.size,
      width: image.width,
      height: image.height,
      display_order: image.display_order,
    })),
    articleTags: article.articleTags.map((at) => ({
      id: at.tag.id,
      name: at.tag.name,
    })),
  };
}
