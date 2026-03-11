import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentCategoryTransformer } from "../transformers/DiscussionBoardAttachmentCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminAttachmentCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachmentCategory.IUpdate;
}): Promise<IDiscussionBoardAttachmentCategory> {
  // 1. Verify the category exists and is not deleted
  const existing =
    await MyGlobal.prisma.discussion_board_attachment_categories.findUniqueOrThrow(
      {
        where: { id: props.categoryId },
      },
    );
  // 2. If parent_id is being modified, validate parent exists and check for circular reference
  if (props.body.parent_id !== undefined) {
    // If parent_id is null, we're making it top-level (valid)
    if (props.body.parent_id === null) {
      // No parent, valid
    } else if (props.body.parent_id === props.categoryId) {
      // Cannot set parent to itself
      throw new HttpException("Category cannot be its own parent", 400);
    } else {
      // Check parent exists and is not deleted
      const parent =
        await MyGlobal.prisma.discussion_board_attachment_categories.findUniqueOrThrow(
          {
            where: { id: props.body.parent_id },
          },
        );
      // Check for circular reference: parent cannot be a descendant of this category
      const checkCircular = async (
        categoryId: string,
        targetId: string,
      ): Promise<boolean> => {
        const category =
          await MyGlobal.prisma.discussion_board_attachment_categories.findUnique(
            {
              where: { id: categoryId },
              select: { parent_id: true },
            },
          );
        if (!category || !category.parent_id) return false;
        if (category.parent_id === targetId) return true;
        return checkCircular(category.parent_id, targetId);
      };
      const hasCircular = await checkCircular(parent.id, props.categoryId);
      if (hasCircular) {
        throw new HttpException(
          "Parent would create a circular reference",
          400,
        );
      }
    }
  }
  // 3. If name is being updated, check uniqueness within same parent hierarchy
  if (props.body.name !== undefined) {
    const parentIdToCheck =
      props.body.parent_id !== undefined
        ? props.body.parent_id
        : existing.parent_id;
    const existingWithSameName =
      await MyGlobal.prisma.discussion_board_attachment_categories.findFirst({
        where: {
          name: props.body.name,
          parent_id: parentIdToCheck,
          deleted_at: null,
          ...(props.body.parent_id === undefined && {
            id: { not: props.categoryId },
          }),
        },
      });
    if (existingWithSameName) {
      throw new HttpException(
        "Name must be unique within the same parent category",
        400,
      );
    }
  }
  // 4. Build update data
  const updateData: Prisma.discussion_board_attachment_categoriesUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.parent_id !== undefined && {
      parent:
        props.body.parent_id === null
          ? { disconnect: true }
          : { connect: { id: props.body.parent_id } },
    }),
    ...(props.body.order_index !== undefined && {
      order_index: props.body.order_index,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    updated_at: new Date(),
  };
  // 5. Execute update
  await MyGlobal.prisma.discussion_board_attachment_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });
  // 6. Fetch updated category with transformer
  const updated =
    await MyGlobal.prisma.discussion_board_attachment_categories.findUniqueOrThrow(
      {
        where: { id: props.categoryId },
        ...DiscussionBoardAttachmentCategoryTransformer.select(),
      },
    );
  // 7. Return transformed result
  return await DiscussionBoardAttachmentCategoryTransformer.transform(updated);
}
