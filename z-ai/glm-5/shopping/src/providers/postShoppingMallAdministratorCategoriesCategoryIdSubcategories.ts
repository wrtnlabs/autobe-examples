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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorCategoriesCategoryIdSubcategories(props: {
  administrator: AdministratorPayload;
  categoryId: string;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  // 1. Verify parent category exists and is not deleted
  const parentCategory =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_id: true,
      },
    });
  // 2. Verify parent is a top-level category (not already a subcategory)
  if (parentCategory.parent_id !== null) {
    throw new HttpException(
      "Cannot create subcategory under another subcategory. Only one level of nesting is allowed.",
      400,
    );
  }
  // 3. Check for duplicate category name
  const existingCategory =
    await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingCategory !== null) {
    throw new HttpException(
      `Category with name "${props.body.name}" already exists.`,
      409,
    );
  }
  // 4. Create subcategory using collector with parent_id from path parameter
  const createdCategory = await MyGlobal.prisma.shopping_mall_categories.create(
    {
      data: await ShoppingMallCategoryCollector.collect({
        body: {
          ...props.body,
          parent_id: props.categoryId, // Use path parameter as parent_id
        },
      }),
      ...ShoppingMallCategoryTransformer.select(),
    },
  );
  // 5. Return transformed response
  return await ShoppingMallCategoryTransformer.transform(createdCategory);
}
