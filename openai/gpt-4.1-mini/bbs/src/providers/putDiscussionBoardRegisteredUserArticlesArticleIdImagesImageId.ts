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

export async function putDiscussionBoardRegisteredUserArticlesArticleIdImagesImageId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IUpdate;
}): Promise<IDiscussionBoardArticleImage> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { registered_user_id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: { id: props.imageId },
    });
  if (!image || image.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Image not found", 404);
  }
  let displayOrder: number | Prisma.IntFieldUpdateOperationsInput | undefined =
    undefined;
  if ("display_order" in props.body) {
    const order = props.body.display_order;
    if (
      typeof order === "number" ||
      (typeof order === "object" && order !== null)
    ) {
      displayOrder = order;
    } else {
      displayOrder = undefined;
    }
  }
  let description: string | null | undefined = undefined;
  if ("description" in props.body) {
    const desc = props.body.description;
    if (typeof desc === "string") {
      description = desc;
    } else if (desc === null) {
      description = null;
    } else {
      description = undefined;
    }
  }
  const updateData: {
    description?: string | null;
    display_order?: number | Prisma.IntFieldUpdateOperationsInput | undefined;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("description" in props.body) updateData.description = description;
  if ("display_order" in props.body) updateData.display_order = displayOrder;
  const updated = await MyGlobal.prisma.discussion_board_article_images.update({
    where: { id: props.imageId },
    data: updateData,
  });
  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    image_url: updated.image_url,
    description: updated.description ?? null,
    display_order: updated.display_order ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
