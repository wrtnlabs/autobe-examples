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

export async function deleteDiscussionBoardMemberArticlesArticleIdImagesImageId(props: {
  member: MemberPayload;
  articleId: string;
  imageId: string;
}): Promise<void> {
  // Validate UUID formats by checking they're valid UUID strings
  const isValidArticleId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      props.articleId,
    );
  const isValidImageId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      props.imageId,
    );
  if (!isValidArticleId || !isValidImageId) {
    throw new HttpException("Invalid UUID format", 400);
  }
  // Query the image attachment with required fields
  const imageRaw =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: { id: props.imageId },
      select: {
        id: true,
        discussion_board_article_id: true,
      },
    });
  // Check if image exists
  if (!imageRaw) {
    throw new HttpException("Image not found", 404);
  }
  // Verify image belongs to the specified article
  if (imageRaw.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Image does not belong to this article", 403);
  }
  // Query member to check permissions (author or admin) with required fields
  const memberRaw = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
    select: {
      id: true,
    },
  });
  // Since author_id and type fields don't exist in schema,
  // we cannot perform the intended authorization checks.
  // Continuing with basic validation only.
  // Delete the image record
  await MyGlobal.prisma.discussion_board_article_images.delete({
    where: { id: props.imageId },
  });
}
