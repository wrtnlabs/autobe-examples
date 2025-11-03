import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdImagesImageId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, articleId, imageId } = props;

  // Verify the image exists and belongs to the specified article
  const image = await MyGlobal.prisma.discussion_board_article_images.findFirst(
    {
      where: {
        id: imageId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    },
  );

  if (!image) {
    throw new HttpException("Image not found or already deleted", 404);
  }

  // Fetch the parent article to verify ownership
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Authorization check - only article author can delete images
  if (article.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete images from your own articles",
      403,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_article_images.update({
    where: {
      id: imageId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
