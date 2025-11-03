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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorArticlesArticleIdImages(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  const { moderator, articleId, body } = props;

  // Verify article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
    },
  });

  if (!article) {
    throw new HttpException("Article not found or has been deleted", 404);
  }

  // Generate UUID for new image record (no @default in schema)
  const imageId = v4();
  const now = toISOStringSafe(new Date());

  // Create image attachment record
  const created = await MyGlobal.prisma.discussion_board_article_images.create({
    data: {
      id: imageId,
      discussion_board_article_id: articleId,
      uploaded_by_member_id: moderator.id,
      original_name: body.original_name,
      stored_name: body.url,
      mime_type: body.mime_type,
      size_bytes: body.size_bytes,
      width: body.width,
      height: body.height,
      created_at: now,
      deleted_at: null,
    },
  });

  // Fetch uploader details from members table
  const uploader =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: moderator.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        profile_picture_url: true,
      },
    });

  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    uploaded_by_member_id: created.uploaded_by_member_id,
    url: created.stored_name,
    original_name: created.original_name,
    stored_name: created.stored_name,
    mime_type: created.mime_type,
    size_bytes: created.size_bytes,
    width: created.width,
    height: created.height,
    created_at: now,
    deleted_at: null,
    uploader: {
      id: uploader.id,
      username: uploader.username,
      display_name: uploader.display_name ?? undefined,
      profile_picture_url: uploader.profile_picture_url ?? undefined,
    },
  };
}
