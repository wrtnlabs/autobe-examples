import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteDiscussionBoardAdminUserArticleCategoriesCategoryCode(props: {
  adminUser: AdminuserPayload;
  categoryCode: string;
}): Promise<void> {
  // Access control is enforced upstream via AdminuserAuth decorator
  // which populates a valid AdminuserPayload into props.adminUser.

  // 1. Locate the category by its unique business code.
  const existingCategory =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        code: props.categoryCode,
      },
    });

  if (existingCategory === null) {
    // No category with this business code exists.
    throw new HttpException("Article category not found", 404);
  }

  if (existingCategory.deleted_at !== null) {
    // Category has already been retired; repeat deletions are treated as
    // not-found-style errors to provide clear semantics to clients.
    throw new HttpException("Article category already retired", 404);
  }

  // 2. Soft-delete (retire) the category by setting deleted_at at the
  // database level. We avoid using the native Date type in TypeScript by
  // delegating timestamp generation to the database itself.
  const affectedRows = await MyGlobal.prisma.$executeRawUnsafe(
    "UPDATE discussion_board_article_categories SET deleted_at = NOW() WHERE code = ? AND deleted_at IS NULL",
    props.categoryCode,
  );

  // If no row was affected (e.g., a race condition where another process
  // retired the category first), surface a not-found style error.
  if (affectedRows === 0) {
    throw new HttpException("Article category not found", 404);
  }
}
