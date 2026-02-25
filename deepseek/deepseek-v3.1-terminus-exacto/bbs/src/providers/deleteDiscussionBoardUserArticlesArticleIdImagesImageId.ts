import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleIdImagesImageId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the image exists and belongs to the specified article
  const image = await MyGlobal.prisma.discussion_board_article_images.findFirst(
    {
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
      include: {
        article: {
          select: {
            id: true,
            discussion_board_user_id: true,
            deleted_at: true,
          },
        },
      },
    },
  );
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  // Verify the article exists and is not deleted
  if (image.article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // Check if user is the article author
  const isAuthor = image.article.discussion_board_user_id === props.user.id;
  // If user is not the author, check if they have administrator privileges
  let isAdmin = false;
  if (!isAuthor) {
    const adminRecord =
      await MyGlobal.prisma.discussion_board_administrators.findFirst({
        where: {
          user_id: props.user.id,
          is_active: true,
          deleted_at: null,
        },
      });
    isAdmin = adminRecord !== null;
  }
  if (!isAuthor && !isAdmin) {
    throw new HttpException("You are not authorized to delete this image", 403);
  }
  // Perform the hard deletion
  await MyGlobal.prisma.discussion_board_article_images.delete({
    where: { id: props.imageId },
  });
}
