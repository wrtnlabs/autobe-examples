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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleIdImagesImageId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify image exists and belongs to user's article
  const existingImage =
    await MyGlobal.prisma.discussion_board_article_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
        article: {
          discussion_board_user_id: props.user.id,
        },
      },
    });
  // Check if display_order needs to be unique within article
  if (props.body.display_order !== existingImage.display_order) {
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
        `Display order ${props.body.display_order} is already in use for this article`,
        400,
      );
    }
  }
  // Build update data with proper null/undefined handling
  const updateData = {
    display_order: props.body.display_order,
    ...(props.body.alt_text !== undefined
      ? { alt_text: props.body.alt_text }
      : {}),
    ...(props.body.caption !== undefined
      ? { caption: props.body.caption }
      : {}),
  };
  // Update the image
  const updatedImage =
    await MyGlobal.prisma.discussion_board_article_images.update({
      where: { id: props.imageId },
      data: updateData,
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(updatedImage);
}
