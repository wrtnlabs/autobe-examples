import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardArticlesArticleId(props: {
  articleId: string;
  body: IEconomicBoardArticle.IRequest;
}): Promise<IEconomicBoardArticle.IFullView> {
  const article = await MyGlobal.prisma.economic_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
    select: {
      id: true,
      title: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: { display_name: true },
      },
      section: {
        select: { name: true },
      },
      fileAttachments: {
        select: {
          original_filename: true,
          size_bytes: true,
          mime_type: true,
          created_at: true,
          storage_path: true,
        },
      },
      images: {
        select: {
          original_filename: true,
          width: true,
          height: true,
          mime_type: true,
          uploaded_at: true,
          thumbnail_path: true,
          medium_path: true,
          original_path: true,
        },
      },
      searchTags: {
        select: {
          tag: {
            select: { text: true },
          },
        },
      },
    },
  });
  if (!article) throw new HttpException("Article not found", 404);
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
    author: {
      display_name: article.author?.display_name,
    },
    section: {
      name: article.section?.name,
    },
    fileAttachments: article.fileAttachments.map((file) => ({
      original_filename: file.original_filename,
      size_bytes: file.size_bytes,
      mime_type: file.mime_type,
      created_at: toISOStringSafe(file.created_at),
      storage_path: file.storage_path,
    })),
    imageAttachments: article.images.map((image) => ({
      original_filename: image.original_filename,
      width: image.width,
      height: image.height,
      mime_type: image.mime_type,
      uploaded_at: toISOStringSafe(image.uploaded_at),
      thumbnail_path: image.thumbnail_path,
      medium_path: image.medium_path,
      original_path: image.original_path,
    })),
    tags: article.searchTags.map((tag) => tag.tag.text),
  };
}
