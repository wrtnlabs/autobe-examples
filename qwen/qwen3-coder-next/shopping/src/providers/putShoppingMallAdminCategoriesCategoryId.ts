import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

export async function putShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  const existing =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (existing.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  const parentCategoryId = props.body.parent_category_id ?? null;
  if (parentCategoryId !== null) {
    if (parentCategoryId === props.categoryId) {
      throw new HttpException("Cannot set category as its own parent", 400);
    }
    const parentExists =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: { id: parentCategoryId, deleted_at: null },
        select: { id: true, parent_category_id: true },
      });
    if (parentExists === null) {
      throw new HttpException("Parent category not found or deleted", 400);
    }
    const isDuplicateName =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          id: { not: props.categoryId },
          parent_category_id: parentCategoryId,
          name: props.body.name,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (isDuplicateName !== null) {
      throw new HttpException(
        "Category name already exists under this parent",
        400,
      );
    }
  } else {
    const isDuplicateName =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          id: { not: props.categoryId },
          parent_category_id: null,
          name: props.body.name,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (isDuplicateName !== null) {
      throw new HttpException("Category name already exists as top-level", 400);
    }
  }
  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      name: props.body.name,
      description: props.body.description ?? null,
      parent_category_id: props.body.parent_category_id ?? null,
      updated_at: new Date(),
    },
    select: {
      id: true,
      name: true,
      description: true,
      parent_category_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const parentCategory = updated.parent_category_id
    ? await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
        where: { id: updated.parent_category_id },
        select: {
          id: true,
          name: true,
          description: true,
          parent_category_id: true,
        },
      })
    : null;
  async function toSummary(category: {
    id: string;
    name: string;
    description: string | null;
    parent_category_id: string | null;
  }): Promise<IShoppingMallCategory.ISummary> {
    const parent = category.parent_category_id
      ? await toSummary({
          id: category.parent_category_id,
          name: "",
          description: null,
          parent_category_id: null,
        })
      : null;
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      parent: parent,
      subcategory_count: 0,
    };
  }
  const result: IShoppingMallCategory = {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    parent_category: parentCategory ? await toSummary(parentCategory) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
  return result;
}
