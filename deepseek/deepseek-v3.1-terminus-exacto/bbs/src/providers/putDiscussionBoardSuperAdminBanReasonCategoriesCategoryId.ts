import { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanReasonCategoryTransformer } from "../transformers/DiscussionBoardBanReasonCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminBanReasonCategoriesCategoryId(props: {
  superAdmin: SuperadminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanReasonCategory.IUpdate;
}): Promise<IDiscussionBoardBanReasonCategory> {
  // Find existing category
  const existingCategory =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.findUnique({
      where: { id: props.categoryId, deleted_at: null },
    });
  if (!existingCategory) {
    throw new HttpException("Ban reason category not found", 404);
  }
  // Check if any fields are being updated
  const hasUpdates = Object.keys(props.body).some(
    (key) => props.body[key as keyof typeof props.body] !== undefined,
  );
  if (!hasUpdates) {
    // Return existing category if no updates
    return await DiscussionBoardBanReasonCategoryTransformer.transform(
      existingCategory,
    );
  }
  // Validate name uniqueness if name is being updated
  if (
    props.body.name !== undefined &&
    props.body.name !== existingCategory.name
  ) {
    const existingWithSameName =
      await MyGlobal.prisma.discussion_board_ban_reason_categories.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.categoryId },
        },
      });
    if (existingWithSameName) {
      throw new HttpException("Ban reason category name already exists", 400);
    }
  }
  // Perform update with transformer
  const updated =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.update({
      where: { id: props.categoryId },
      data: {
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
        updated_at: toISOStringSafe(new Date()),
      },
      ...DiscussionBoardBanReasonCategoryTransformer.select(),
    });
  return await DiscussionBoardBanReasonCategoryTransformer.transform(updated);
}
