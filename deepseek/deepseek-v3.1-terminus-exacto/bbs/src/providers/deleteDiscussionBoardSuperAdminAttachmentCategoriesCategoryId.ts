import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminAttachmentCategoriesCategoryId(props: {
  superAdmin: SuperadminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify category exists
  const category =
    await MyGlobal.prisma.discussion_board_attachment_categories.findUniqueOrThrow(
      {
        where: { id: props.categoryId },
      },
    );
  // Check for active child categories
  const childCategories =
    await MyGlobal.prisma.discussion_board_attachment_categories.findMany({
      where: {
        parent_id: props.categoryId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (childCategories.length > 0) {
    throw new HttpException(
      `Cannot delete category with ${childCategories.length} active child categories. Move or delete child categories first.`,
      400,
    );
  }
  // Delete the category (cascade will handle children and mappings automatically via onDelete: Cascade)
  await MyGlobal.prisma.discussion_board_attachment_categories.delete({
    where: { id: props.categoryId },
  });
  // No return value needed (void)
}
