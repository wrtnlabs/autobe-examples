import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardTagsTagId(props: {
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const tagId = props.tagId;
  // Check if the tag exists
  const existingTag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { id: tagId },
    select: { id: true },
  });
  if (!existingTag) {
    throw new HttpException("Tag not found", 404);
  }
  try {
    // Start transaction
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Delete all article-tag mappings related to this tag
      await tx.discussion_board_article_tag_mappings.deleteMany({
        where: { discussion_board_tag_id: tagId },
      });
      // Delete the tag itself
      await tx.discussion_board_tags.delete({
        where: { id: tagId },
      });
    });
  } catch (error) {
    throw new HttpException("Failed to delete tag", 500);
  }
  // Log deletion for audit - placeholder
  // Actual audit logging should be here if implemented
  return;
}
