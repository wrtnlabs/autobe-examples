import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  // 1. Find the category with subcategories to verify existence and check constraints
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        parent_id: true,
        deleted_at: true,
        subcategories: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
      },
    });
  // 2. Verify category is not soft-deleted
  if (category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  const hasSubcategories = category.subcategories.length > 0;
  const currentParentId = category.parent_id;
  const targetParentId =
    props.body.parentId !== undefined ? props.body.parentId : currentParentId;
  // 3. Validate name uniqueness within same parent scope (excluding current category)
  if (props.body.name !== undefined) {
    const nameConflict =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          id: { not: props.categoryId },
          name: props.body.name,
          parent_id: targetParentId,
          deleted_at: null,
        },
      });
    if (nameConflict) {
      throw new HttpException(
        "Category name must be unique within the same parent scope",
        409,
      );
    }
  }
  // 4. Cannot change parent_id to null if category has subcategories
  const isChangingToNull =
    props.body.parentId === null && currentParentId !== null;
  if (isChangingToNull && hasSubcategories) {
    throw new HttpException(
      "Cannot convert a category with subcategories to a top-level category",
      400,
    );
  }
  // 5. A subcategory (has parent_id) cannot become a parent of other categories
  const isCurrentlySubcategory = currentParentId !== null;
  if (isCurrentlySubcategory && hasSubcategories) {
    throw new HttpException(
      "A subcategory cannot become a parent of other subcategories",
      400,
    );
  }
  // 6. Validate parent category exists if being set
  if (targetParentId !== null) {
    const parentExists =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          id: targetParentId,
          deleted_at: null,
        },
      });
    if (!parentExists) {
      throw new HttpException("Parent category does not exist", 404);
    }
  }
  // 7. Build update data object
  const updateData: Prisma.ecommerce_mall_categoriesUpdateInput = {};
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.parentId !== undefined) {
    if (props.body.parentId === null) {
      updateData.parent = undefined;
    } else {
      updateData.parent = { connect: { id: props.body.parentId } };
    }
  }
  // 8. Update the category with optimistic locking via updated_at
  const updated = await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      ...updateData,
      updated_at: new Date(),
    },
    ...EcommerceMallCategoryTransformer.select(),
  });
  // 9. Return transformed result
  return await EcommerceMallCategoryTransformer.transform(updated);
}
