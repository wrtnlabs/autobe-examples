import { IDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImageFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdImagesImageIdFiles(props: {
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IPageIDiscussionBoardArticleImageFile> {
  // Validate article existence
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Validate image existence and relation to article
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
    });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  // Query files with pagination (default page 1, limit 100)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const files =
    await MyGlobal.prisma.discussion_board_article_image_files.findMany({
      where: {
        discussion_board_article_image_id: props.imageId,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.discussion_board_article_image_files.count({
      where: {
        discussion_board_article_image_id: props.imageId,
      },
    });
  // Transform data to match DTO structure
  const data: IDiscussionBoardArticleImageFile[] = files.map((file) => ({
    id: file.id as string & tags.Format<"uuid">,
    filename: file.filename,
    file_size: file.file_size,
    mime_type: file.mime_type,
    storage_path: file.storage_path,
    original_filename:
      file.original_filename === null ? undefined : file.original_filename,
    created_at: toISOStringSafe(file.created_at),
    updated_at: toISOStringSafe(file.updated_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
