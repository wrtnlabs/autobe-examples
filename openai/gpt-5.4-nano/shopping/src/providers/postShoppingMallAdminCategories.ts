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
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  const parentCategoryId = props.body.parent_category_id;
  const hasParent = parentCategoryId != null;
  const parentCategory = hasParent
    ? await MyGlobal.prisma.shopping_mall_categories.findUnique({
        where: { id: parentCategoryId },
        select: { id: true, parent_category_id: true },
      })
    : null;
  if (hasParent && parentCategory === null) {
    throw new HttpException("Parent category not found", 404);
  }
  if (
    hasParent &&
    parentCategory !== null &&
    parentCategory.parent_category_id !== null
  ) {
    throw new HttpException("One-level nesting rule violation", 400);
  }
  const existingBySlug =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { slug: props.body.slug },
      select: { id: true },
    });
  if (existingBySlug !== null) {
    throw new HttpException("Slug already exists", 409);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const data: Prisma.shopping_mall_categoriesCreateInput = {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      slug: props.body.slug,
      visibility: props.body.visibility,
      display_order: props.body.display_order,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...(hasParent
        ? {
            parentCategory: { connect: { id: parentCategoryId } },
          }
        : {}),
    };
    return await tx.shopping_mall_categories.create({
      data,
      ...ShoppingMallCategoryTransformer.select(),
    });
  });
  return await ShoppingMallCategoryTransformer.transform(created);
}
