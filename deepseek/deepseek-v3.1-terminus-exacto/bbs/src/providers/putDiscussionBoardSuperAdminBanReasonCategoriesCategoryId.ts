import { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardBanReasonCategoryTransformer } from "../transformers/DiscussionBoardBanReasonCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminBanReasonCategoriesCategoryId(props: {
  superAdmin: SuperAdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanReasonCategory.IUpdate;
}): Promise<IDiscussionBoardBanReasonCategory> {
  // 1. Verify the category exists
  const existing =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.findUniqueOrThrow(
      {
        where: { id: props.categoryId },
        select: { id: true, name: true },
      },
    );
  // 2. Check for name uniqueness conflict if name is being updated
  if (props.body.name !== undefined && props.body.name !== existing.name) {
    const conflicting =
      await MyGlobal.prisma.discussion_board_ban_reason_categories.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.categoryId },
          deleted_at: null, // Only check active (not soft-deleted) categories
        },
        select: { id: true },
      });
    if (conflicting !== null) {
      throw new HttpException(
        `Category name '${props.body.name}' already exists`,
        400,
      );
    }
  }
  // 3. Build update data with conditional field updates
  const updateData: Prisma.discussion_board_ban_reason_categoriesUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.sort_order !== undefined && {
      sort_order: props.body.sort_order,
    }),
    updated_at: new Date(),
  };
  // 4. Perform update
  await MyGlobal.prisma.discussion_board_ban_reason_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });
  // 5. Retrieve updated category with transformer
  const updated =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.findUniqueOrThrow(
      {
        where: { id: props.categoryId },
        ...DiscussionBoardBanReasonCategoryTransformer.select(),
      },
    );
  // 6. Return transformed result
  return await DiscussionBoardBanReasonCategoryTransformer.transform(updated);
}
