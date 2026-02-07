import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberArticlesArticleIdImagesImageId(props: {
  member: MemberPayload;
  articleId: string;
  imageId: string;
  body: IDiscussionBoardArticleImage.IUpdate;
}): Promise<IDiscussionBoardArticleImage> {
  const record =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: {
        id: props.imageId as string & tags.Format<"uuid">,
        discussion_board_article_id: props.articleId,
      },
      select: {
        id: true,
        discussion_board_article_id: true,
        original_filename: true,
        stored_filename: true,
        mime_type: true,
        size: true,
        width: true,
        height: true,
        display_order: true,
      },
    });
  if (!record) {
    throw new HttpException("Image not found", 404);
  }
  // Verify authorization: only article author or admin can update
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.author_id !== props.member.id) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.member.id },
    });
    if (!admin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Build update data using only fields that exist in IUpdate
  const updateData: any = {};
  if (
    "original_filename" in props.body &&
    props.body.original_filename !== undefined
  ) {
    updateData.original_filename = props.body.original_filename;
  }
  if (
    "stored_filename" in props.body &&
    props.body.stored_filename !== undefined
  ) {
    updateData.stored_filename = props.body.stored_filename;
  }
  if ("mime_type" in props.body && props.body.mime_type !== undefined) {
    updateData.mime_type = props.body.mime_type;
  }
  if ("size" in props.body && props.body.size !== undefined) {
    updateData.size = props.body.size;
  }
  if ("width" in props.body && props.body.width !== undefined) {
    updateData.width = props.body.width;
  }
  if ("height" in props.body && props.body.height !== undefined) {
    updateData.height = props.body.height;
  }
  if ("display_order" in props.body && props.body.display_order !== undefined) {
    updateData.display_order = props.body.display_order;
  }
  const updated = await MyGlobal.prisma.discussion_board_article_images.update({
    where: { id: props.imageId as string & tags.Format<"uuid"> },
    data: updateData,
  });
  return {
    id: updated.id,
    article_id: updated.discussion_board_article_id,
    original_filename: updated.original_filename,
    stored_filename: updated.stored_filename,
    mime_type: updated.mime_type,
    size: updated.size,
    width: updated.width,
    height: updated.height,
    display_order: updated.display_order,
    created_at: toISOStringSafe(new Date()),
    updated_at: toISOStringSafe(new Date()),
  };
}
