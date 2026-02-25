import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminBanReasonCategoriesCategoryId(props: {
  superAdmin: SuperAdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the superAdmin is valid and active
  const superAdminExists =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  if (!superAdminExists) {
    throw new HttpException("Super administrator not found or inactive", 403);
  }
  // Verify the category exists and is not already deleted
  const existingCategory =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.findFirst({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
    });
  if (!existingCategory) {
    throw new HttpException(
      "Ban reason category not found or already deleted",
      404,
    );
  }
  // Perform soft deletion using Prisma's NOW() equivalent
  // Prisma will handle the timestamp conversion internally
  await MyGlobal.prisma.discussion_board_ban_reason_categories.update({
    where: { id: props.categoryId },
    data: {
      deleted_at: new Date(), // Prisma handles DateTime conversion
    },
  });
}
