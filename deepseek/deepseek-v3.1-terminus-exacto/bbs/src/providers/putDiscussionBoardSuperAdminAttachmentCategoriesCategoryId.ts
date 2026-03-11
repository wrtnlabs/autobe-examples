import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentCategoryTransformer } from "../transformers/DiscussionBoardAttachmentCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminAttachmentCategoriesCategoryId(props: {
  superAdmin: SuperadminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachmentCategory.IUpdate;
}): Promise<IDiscussionBoardAttachmentCategory> {
  // 1. Verify category exists
  const existingCategory =
    await MyGlobal.prisma.discussion_board_attachment_categories.findUniqueOrThrow(
      {
        where: { id: props.categoryId },
        select: {
          id: true,
          name: true,
          parent_id: true,
          is_active: true,
          order_index: true,
        },
      },
    );
  // 2. Validate parent_id if being modified
  if (props.body.parent_id !== undefined) {
    // Check for circular reference if parent_id is not null
    if (props.body.parent_id !== null) {
      // Ensure parent exists
      await MyGlobal.prisma.discussion_board_attachment_categories.findUniqueOrThrow(
        {
          where: { id: props.body.parent_id },
          select: { id: true },
        },
      );
      // Check for circular reference (can't be own parent or create cycles)
      if (props.body.parent_id === props.categoryId) {
        throw new HttpException("Category cannot be its own parent", 400);
      }
      // Check for deeper circular reference by traversing parent chain
      const visited = new Set<string>();
      let currentId: string | null = props.body.parent_id;
      while (currentId) {
        if (visited.has(currentId)) {
          throw new HttpException(
            "Circular reference detected in category hierarchy",
            400,
          );
        }
        if (currentId === props.categoryId) {
          throw new HttpException(
            "Circular reference detected in category hierarchy",
            400,
          );
        }
        visited.add(currentId);
        const parent: {
          parent_id: string | null;
        } | null =
          await MyGlobal.prisma.discussion_board_attachment_categories.findUnique(
            {
              where: { id: currentId },
              select: { parent_id: true },
            },
          );
        currentId = parent?.parent_id ?? null;
      }
    }
  }
  // 3. Check name uniqueness within same parent hierarchy
  if (props.body.name !== undefined) {
    const targetParentId =
      props.body.parent_id !== undefined
        ? props.body.parent_id
        : existingCategory.parent_id;
    const whereCondition = {
      name: props.body.name,
      ...(targetParentId === null
        ? { parent_id: null }
        : { parent_id: targetParentId }),
      NOT: { id: props.categoryId },
      deleted_at: null,
    } satisfies Prisma.discussion_board_attachment_categoriesWhereInput;
    const existingWithSameName =
      await MyGlobal.prisma.discussion_board_attachment_categories.findFirst({
        where: whereCondition,
        select: { id: true },
      });
    if (existingWithSameName) {
      throw new HttpException(
        "Category name must be unique within the same parent hierarchy",
        409,
      );
    }
  }
  // 4. Build update data
  const updateData: Prisma.discussion_board_attachment_categoriesUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.order_index !== undefined && {
      order_index: props.body.order_index,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.parent_id !== undefined && {
      parent:
        props.body.parent_id === null
          ? { disconnect: true }
          : { connect: { id: props.body.parent_id } },
    }),
    updated_at: new Date(),
  };
  // 5. Perform update
  await MyGlobal.prisma.discussion_board_attachment_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });
  // 6. Fetch updated category with transformer selection
  const updatedCategory =
    await MyGlobal.prisma.discussion_board_attachment_categories.findUniqueOrThrow(
      {
        where: { id: props.categoryId },
        ...DiscussionBoardAttachmentCategoryTransformer.select(),
      },
    );
  // 7. Transform and return
  return await DiscussionBoardAttachmentCategoryTransformer.transform(
    updatedCategory,
  );
}
