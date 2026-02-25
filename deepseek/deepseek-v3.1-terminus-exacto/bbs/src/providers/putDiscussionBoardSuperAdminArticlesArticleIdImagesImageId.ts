import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesArticleIdImagesImageId(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify both article and image existence with transaction
  const [article, existingImage] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    }),
    MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
    }),
  ]);
  if (!existingImage) {
    throw new HttpException(
      "Image attachment not found or does not belong to the specified article",
      404,
    );
  }
  // Validate display_order uniqueness if provided
  if (
    props.body.display_order !== undefined &&
    props.body.display_order !== existingImage.display_order
  ) {
    const conflictingImage =
      await MyGlobal.prisma.discussion_board_article_images.findFirst({
        where: {
          discussion_board_article_id: props.articleId,
          display_order: props.body.display_order,
          id: { not: props.imageId },
        },
      });
    if (conflictingImage) {
      throw new HttpException(
        "Display order must be unique within the article",
        400,
      );
    }
  }
  // Build update data with Prisma type safety
  const updateData: Prisma.discussion_board_article_imagesUpdateInput = {
    ...(props.body.display_order !== undefined && {
      display_order: props.body.display_order,
    }),
    ...(props.body.alt_text !== undefined && { alt_text: props.body.alt_text }),
    ...(props.body.caption !== undefined && { caption: props.body.caption }),
  };
  // Execute update and fetch updated record in transaction
  const [updatedImage] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_article_images.update({
      where: { id: props.imageId },
      data: updateData,
      ...DiscussionBoardArticleFileTransformer.select(),
    }),
  ]);
  return await DiscussionBoardArticleFileTransformer.transform(updatedImage);
}
