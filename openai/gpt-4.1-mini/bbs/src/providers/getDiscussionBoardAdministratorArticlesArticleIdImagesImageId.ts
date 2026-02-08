import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorArticlesArticleIdImagesImageId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleImage> {
  const record =
    await MyGlobal.prisma.discussion_board_article_images.findFirst({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!record) throw new HttpException("Image not found", 404);
  return {
    id: record.id,
    discussion_board_article_id: record.discussion_board_article_id,
    url: record.image_url,
    description: record.description === null ? null : record.description,
    order: record.display_order === null ? null : record.display_order,
    file_type: null,
    content_type: null,
    created_at: toISOStringSafe(record.created_at),
    updated_at:
      record.updated_at === null ? null : toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
