import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdImagesImageId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleImage> {
  const image = await MyGlobal.prisma.discussion_board_article_images.findFirst(
    {
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
    },
  );

  if (!image) {
    throw new HttpException(
      "Image not found or does not belong to the specified article",
      404,
    );
  }

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You do not have permission to delete images from this article",
      403,
    );
  }

  const deletedImage =
    await MyGlobal.prisma.discussion_board_article_images.update({
      where: { id: props.imageId },
      data: {
        deleted_at: new Date(),
      },
    });

  return {
    id: deletedImage.id as string & tags.Format<"uuid">,
    discussion_board_article_id:
      deletedImage.discussion_board_article_id as string & tags.Format<"uuid">,
    original_filename: deletedImage.original_filename,
    file_size: deletedImage.file_size,
    content_type: deletedImage.content_type,
    storage_url: deletedImage.storage_url as string & tags.Format<"uri">,
    width: deletedImage.width !== null ? deletedImage.width : null,
    height: deletedImage.height !== null ? deletedImage.height : null,
    created_at: toISOStringSafe(deletedImage.created_at),
    deleted_at:
      deletedImage.deleted_at !== null
        ? toISOStringSafe(deletedImage.deleted_at)
        : null,
  };
}
