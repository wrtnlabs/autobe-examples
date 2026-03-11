import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminAttachmentCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the category exists and is active
  const category =
    await MyGlobal.prisma.discussion_board_attachment_categories.findUniqueOrThrow(
      {
        where: { id: props.categoryId },
        select: {
          id: true,
          deleted_at: true,
          children: {
            where: { deleted_at: null },
            select: { id: true, name: true },
          } satisfies Prisma.discussion_board_attachment_categoriesFindManyArgs,
          attachmentMappings: {
            select: { id: true },
          } satisfies Prisma.discussion_board_attachment_category_mappingsFindManyArgs,
        },
      },
    );
  // Check if category is already deleted
  if (category.deleted_at !== null) {
    throw new HttpException("Category already deleted", 400);
  }
  // Check if category has any active child categories
  if (category.children.length > 0) {
    throw new HttpException(
      "Cannot delete category with active child categories",
      400,
    );
  }
  // Delete all attachment-category mappings associated with this category
  // Use onDelete: Cascade should handle this, but we'll delete explicitly for clarity
  await MyGlobal.prisma.discussion_board_attachment_category_mappings.deleteMany(
    {
      where: { discussion_board_attachment_category_id: props.categoryId },
    },
  );
  // Soft delete the category
  await MyGlobal.prisma.discussion_board_attachment_categories.update({
    where: { id: props.categoryId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
