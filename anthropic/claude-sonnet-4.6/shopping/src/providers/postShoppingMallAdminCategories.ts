import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryCollector } from "../collectors/ShoppingMallCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  // Step 1: Validate parent_id if provided
  if (props.body.parent_id != null) {
    const parent =
      await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
        where: { id: props.body.parent_id },
        select: { id: true, parent_id: true },
      });
    if (parent.parent_id !== null) {
      throw new HttpException(
        "The specified parent category is itself a subcategory. Only top-level categories can serve as parents.",
        400,
      );
    }
  }
  // Step 2: Uniqueness check at the same hierarchy level
  const existingCategory =
    await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        parent_id: props.body.parent_id ?? null,
        name: props.body.name,
      },
      select: { id: true },
    });
  if (existingCategory !== null) {
    throw new HttpException(
      "A category with the same name already exists at this hierarchy level.",
      409,
    );
  }
  // Step 3: Create the category using Collector + Transformer
  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: await ShoppingMallCategoryCollector.collect({ body: props.body }),
    ...ShoppingMallCategoryTransformer.select(),
  });
  // Step 4: Transform and return
  return await ShoppingMallCategoryTransformer.transform(created);
}
