import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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

export async function getDiscussionBoardArticlesArticleIdImagesImageId(props: {
  articleId: string;
  imageId: string;
}): Promise<IDiscussionBoardArticleImage> {
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
      },
      select: {
        id: true,
        original_filename: true,
        stored_path: true,
        mime_type: true,
        file_size: true,
        created_at: true,
      },
    });
  return {
    id: image.id,
    original_filename: image.original_filename,
    stored_path: image.stored_path,
    mime_type: image.mime_type,
    file_size: image.file_size,
    created_at: toISOStringSafe(image.created_at),
  };
}
