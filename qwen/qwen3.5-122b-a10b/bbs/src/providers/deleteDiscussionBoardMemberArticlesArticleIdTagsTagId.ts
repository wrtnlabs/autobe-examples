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

export async function deleteDiscussionBoardMemberArticlesArticleIdTagsTagId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify article exists and is not soft-deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: {
      id: true,
      discussion_board_member_id: true,
      deleted_at: true,
    },
  });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // Step 2: Verify tag exists and is not soft-deleted
  const tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { id: props.tagId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (tag === null) {
    throw new HttpException("Tag not found", 404);
  }
  if (tag.deleted_at !== null) {
    throw new HttpException("Tag not found", 404);
  }
  // Step 3: Verify authorization (owner or admin)
  const isOwner = article.discussion_board_member_id === props.member.id;
  if (!isOwner) {
    // Check if user is an administrator
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.member.id },
    });
    if (admin === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Find and soft-delete the junction table record
  const association =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        discussion_board_tag_id: props.tagId,
        deleted_at: null,
      },
    });
  if (association === null) {
    throw new HttpException("Association not found", 404);
  }
  // Soft delete the association by setting deleted_at
  await MyGlobal.prisma.discussion_board_article_tags.update({
    where: { id: association.id },
    data: {
      deleted_at: new Date(),
    },
  });
}
