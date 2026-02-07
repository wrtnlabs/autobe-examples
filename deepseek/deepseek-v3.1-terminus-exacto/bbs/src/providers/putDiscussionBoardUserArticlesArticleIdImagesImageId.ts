import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageFile";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleImageTransformer } from "../transformers/DiscussionBoardArticleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleIdImagesImageId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IUpdate;
}): Promise<IDiscussionBoardArticleImage> {
  // Verify the article exists and belongs to the user
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
      discussion_board_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException(
      "Article not found or you don't have permission to modify it",
      404,
    );
  }
  // Verify the image exists and belongs to the specified article
  const existingImage =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
    });
  if (!existingImage) {
    throw new HttpException("Image not found for the specified article", 404);
  }
  // Validate status if provided
  if (props.body.status !== undefined) {
    const validStatuses = [
      "uploaded",
      "processing",
      "active",
      "archived",
      "deleted",
    ];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
  }
  // Validate display_order if provided
  if (props.body.display_order !== undefined && props.body.display_order < 0) {
    throw new HttpException("Display order must be non-negative", 400);
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_article_imagesUpdateInput = {};
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.display_order !== undefined) {
    updateData.display_order = props.body.display_order;
  }
  if (props.body.alt_text !== undefined) {
    updateData.alt_text =
      props.body.alt_text === null ? null : props.body.alt_text;
  }
  if (props.body.caption !== undefined) {
    updateData.caption =
      props.body.caption === null ? null : props.body.caption;
  }
  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    throw new HttpException("No fields provided for update", 400);
  }
  // Update the image
  const updatedImage =
    await MyGlobal.prisma.discussion_board_article_images.update({
      where: { id: props.imageId },
      data: updateData,
      ...DiscussionBoardArticleImageTransformer.select(),
    });
  return await DiscussionBoardArticleImageTransformer.transform(updatedImage);
}
