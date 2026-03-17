import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  const resolvedParentId = props.body.parentId ?? null;
  if (resolvedParentId !== null) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        id: resolvedParentId,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_id: true,
      },
    });
    if (parent === null)
      throw new HttpException("Parent category not found", 404);
    if (parent.parent_id !== null)
      throw new HttpException("Subcategory depth limit exceeded", 400);
  }
  const duplicate = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      parent_id: resolvedParentId,
      name: props.body.name,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (duplicate !== null)
    throw new HttpException(
      "Category name already exists within the same parent scope",
      409,
    );
  const now = new Date();
  const categoryId = v4();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_categories.create({
      data: {
        id: categoryId,
        name: props.body.name,
        description: props.body.description,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        parent:
          resolvedParentId !== null
            ? {
                connect: {
                  id: resolvedParentId,
                },
              }
            : undefined,
      },
      select: {
        id: true,
      },
    });
    await tx.shopping_mall_category_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_category_id: categoryId,
        change_summary: "Category created",
        before_value: "Not applicable",
        after_value: JSON.stringify({
          name: props.body.name,
          description: props.body.description,
          parentId: resolvedParentId,
        }),
        created_at: now,
        updated_at: now,
      },
    });
  });
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: {
        id: categoryId,
      },
      ...ShoppingMallCategoryTransformer.select(),
    });
  return await ShoppingMallCategoryTransformer.transform(category);
}
