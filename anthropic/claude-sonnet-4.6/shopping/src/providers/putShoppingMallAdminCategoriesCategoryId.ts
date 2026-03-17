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
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Verify the category exists and get parent_id for uniqueness check
    const existing = await tx.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: { id: true, parent_id: true },
    });
    // Step 2: Enforce name uniqueness at the same hierarchy level
    const duplicateWhereInput = (
      existing.parent_id === null
        ? {
            id: { not: props.categoryId },
            name: props.body.name,
            parent_id: null,
          }
        : {
            id: { not: props.categoryId },
            name: props.body.name,
            parent_id: existing.parent_id,
          }
    ) satisfies Prisma.shopping_mall_categoriesWhereInput;
    const conflict = await tx.shopping_mall_categories.findFirst({
      where: duplicateWhereInput,
      select: { id: true },
    });
    if (conflict !== null) {
      throw new HttpException(
        "A category with the same name already exists at this hierarchy level.",
        409,
      );
    }
    // Step 3: Perform the update
    await tx.shopping_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        name: props.body.name,
        description: props.body.description ?? null,
        updated_at: new Date(),
      },
    });
    // Step 4: Fetch and return the full updated category
    const updated = await tx.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...ShoppingMallCategoryTransformer.select(),
    });
    return await ShoppingMallCategoryTransformer.transform(updated);
  });
}
