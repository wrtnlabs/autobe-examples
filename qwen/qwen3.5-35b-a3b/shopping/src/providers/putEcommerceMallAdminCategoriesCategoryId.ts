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
  const existingCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
        is_leaf: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
            name: true,
            is_leaf: true,
            parent_category_id: true,
          },
        },
      },
    });
  if (existingCategory.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  const newName = props.body.name;
  if (newName !== undefined) {
    const nameConflict =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          name: newName,
          parent_category_id: existingCategory.parent_category_id,
          id: { not: props.categoryId },
        },
      });
    if (nameConflict !== null) {
      throw new HttpException("Category name already exists", 409);
    }
  }
  const newParentId = props.body.parent_category_id;
  if (
    newParentId !== undefined &&
    newParentId !== null &&
    newParentId !== existingCategory.parent_category_id
  ) {
    const newParent =
      await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
        where: { id: newParentId },
        select: { id: true, parent_category_id: true, is_leaf: true },
      });
    if (newParent === null) {
      throw new HttpException("Parent category not found", 404);
    }
    if (newParent.parent_category_id !== null) {
      throw new HttpException("Parent category cannot be a subcategory", 400);
    }
    if (newParentId === existingCategory.id) {
      throw new HttpException("Category cannot be its own parent", 400);
    }
  }
  const oldValues = {
    name: existingCategory.name,
    description: existingCategory.description,
    parent_category_id: existingCategory.parent_category_id,
    is_leaf: existingCategory.is_leaf,
  };
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parent_category_id !== undefined && {
        parent_category_id: props.body.parent_category_id,
      }),
      ...(props.body.is_leaf !== undefined && { is_leaf: props.body.is_leaf }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      include: {
        _count: { select: { products: true, children: true } },
        products: { select: { id: true } },
        productSnapshots: { select: { id: true } },
        snapshots: { select: { id: true } },
        parent: true,
        children: { select: { id: true } },
      },
    });
  return await EcommerceMallCategoryTransformer.transform(updated);
}
