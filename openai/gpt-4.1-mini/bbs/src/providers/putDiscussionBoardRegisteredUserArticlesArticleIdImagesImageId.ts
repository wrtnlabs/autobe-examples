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
import { DiscussionBoardArticleImageTransformer } from "../transformers/DiscussionBoardArticleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardRegisteredUserArticlesArticleIdImagesImageId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IUpdate;
}): Promise<IDiscussionBoardArticleImage> {
  const existingImage =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: { id: props.imageId },
      include: { article: true },
    });
  if (
    !existingImage ||
    existingImage.discussion_board_article_id !== props.articleId ||
    existingImage.deleted_at !== null
  ) {
    throw new HttpException("Image not found", 404);
  }
  if (existingImage.article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: {
    image_url?: string;
    description?: string | null;
    display_order?: number;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.imageUrl !== undefined)
    updateData.image_url = props.body.imageUrl;
  if (props.body.description !== undefined)
    updateData.description =
      props.body.description === null ? null : props.body.description;
  if (props.body.displayOrder !== undefined)
    updateData.display_order = props.body.displayOrder;
  await MyGlobal.prisma.discussion_board_article_images.update({
    where: { id: props.imageId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...DiscussionBoardArticleImageTransformer.select(),
    });
  return await DiscussionBoardArticleImageTransformer.transform(updated);
}
