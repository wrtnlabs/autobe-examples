import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
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

export async function getEconomicBoardArticlesArticleId(props: {
  articleId: string;
}): Promise<IEconomicBoardCitizen> {
  const article = await MyGlobal.prisma.economic_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
    include: {
      author: {
        select: { display_name: true, email: true },
      },
      section: {
        select: { name: true },
      },
      fileAttachments: {
        select: {
          id: true,
          original_filename: true,
          size_bytes: true,
          mime_type: true,
          storage_path: true,
          created_at: true,
          updated_at: true,
        },
      },
      images: {
        select: {
          id: true,
          original_filename: true,
          width: true,
          height: true,
          mime_type: true,
          original_path: true,
          thumbnail_path: true,
          medium_path: true,
          uploaded_at: true,
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
    author: {
      id: article.economic_board_citizen_id,
      display_name: article.author?.display_name || "",
      email: article.author?.email || "",
    },
    section: {
      id: article.economic_board_section_id,
      name: article.section?.name || "",
    },
    files:
      article.fileAttachments?.map((file) => ({
        id: file.id,
        original_filename: file.original_filename,
        size_bytes: file.size_bytes,
        mime_type: file.mime_type,
        storage_path: file.storage_path,
        created_at: toISOStringSafe(file.created_at),
        updated_at: toISOStringSafe(file.updated_at),
      })) || [],
    images:
      article.images?.map((image) => ({
        id: image.id,
        original_filename: image.original_filename,
        width: image.width,
        height: image.height,
        mime_type: image.mime_type,
        original_path: image.original_path,
        thumbnail_path: image.thumbnail_path,
        medium_path: image.medium_path,
        uploaded_at: toISOStringSafe(image.uploaded_at),
      })) || [],
  } as IEconomicBoardCitizen;
}
