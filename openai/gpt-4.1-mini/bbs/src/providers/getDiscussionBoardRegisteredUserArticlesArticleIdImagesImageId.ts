import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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

export async function getDiscussionBoardRegisteredUserArticlesArticleIdImagesImageId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleImage> {
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: { id: props.imageId },
    });
  if (image.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Article image not found", 404);
  }
  return {
    id: image.id,
    discussionBoardArticleId: image.discussion_board_article_id,
    imageUrl: image.image_url,
    description: image.description ?? undefined,
    displayOrder: image.display_order,
    createdAt: toISOStringSafe(image.created_at),
    updatedAt: toISOStringSafe(image.updated_at),
    deletedAt: image.deleted_at ? toISOStringSafe(image.deleted_at) : null,
  };
}
