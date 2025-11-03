import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function getDiscussionBoardArticlesArticleIdImagesImageId(props: {
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleImage> {
  const { articleId, imageId } = props;

  const image = await MyGlobal.prisma.discussion_board_article_images.findFirst(
    {
      where: {
        id: imageId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
      include: {
        uploader: true,
      },
    },
  );

  if (!image) {
    throw new HttpException(
      "Image not found or does not belong to the specified article",
      404,
    );
  }

  const url = `/storage/images/${image.stored_name}`;

  return {
    id: image.id,
    discussion_board_article_id: image.discussion_board_article_id,
    uploaded_by_member_id: image.uploaded_by_member_id,
    url: url,
    original_name: image.original_name,
    stored_name: image.stored_name,
    mime_type: image.mime_type,
    size_bytes: image.size_bytes,
    width: image.width,
    height: image.height,
    created_at: toISOStringSafe(image.created_at),
    deleted_at: image.deleted_at ? toISOStringSafe(image.deleted_at) : null,
    uploader: {
      id: image.uploader.id,
      username: image.uploader.username,
      display_name: image.uploader.display_name ?? undefined,
      profile_picture_url: image.uploader.profile_picture_url ?? undefined,
    },
  };
}
