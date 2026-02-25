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
  articleId: string;
  imageId: string;
}): Promise<void> {
  // Find the image with article info for validation and authorization
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: { id: props.imageId },
      select: {
        id: true,
        discussion_board_article_id: true,
        article: {
          select: {
            discussion_board_user_id: true,
            deleted_at: true,
          },
        },
      },
    });
  // Check if image exists
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  // Verify image belongs to the specified article
  if (image.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Image not found", 404);
  }
  // Check if article is deleted
  if (image.article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // Authorization check: user is author
  const isAuthor = image.article.discussion_board_user_id === props.user.id;
  if (!isAuthor) {
    // Check if user has admin privileges
    const currentUser = await MyGlobal.prisma.discussion_board_users.findUnique(
      {
        where: { id: props.user.id },
        select: { permission_level: true },
      },
    );
    const isAdmin =
      currentUser?.permission_level === "ADMINISTRATOR" ||
      currentUser?.permission_level === "SUPER_ADMINISTRATOR";
    if (!isAdmin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Delete the image record
  await MyGlobal.prisma.discussion_board_article_images.delete({
    where: { id: props.imageId },
  });
}
