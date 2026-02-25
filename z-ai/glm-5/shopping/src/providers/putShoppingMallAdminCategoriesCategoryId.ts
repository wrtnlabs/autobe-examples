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

export async function putShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  // Fetch the category to update (deleted_at: null filter ensures not soft-deleted)
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_id: true,
        name: true,
      },
    });
  // Check sibling uniqueness if name is being updated and different from current
  if (props.body.name !== undefined && props.body.name !== category.name) {
    const duplicate = await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        parent_id: category.parent_id,
        name: props.body.name,
        id: { not: props.categoryId },
        deleted_at: null,
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "Category name must be unique among sibling categories",
        409,
      );
    }
  }
  // Build update data - only include fields that are explicitly provided
  const updateData: {
    name?: string;
    description?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // Update the category and return transformed result
  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: updateData,
    ...ShoppingMallCategoryTransformer.select(),
  });
  return await ShoppingMallCategoryTransformer.transform(updated);
}
