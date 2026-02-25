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

export async function postShoppingMallAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  // Check uniqueness of category name within the same parent category scope
  const existing = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: {
      parent_category_id_name: {
        parent_category_id: (props.body.parentCategoryId ?? "") as string,
        name: props.body.name,
      },
    },
  });
  if (existing !== null) {
    throw new HttpException(
      `Category name '${props.body.name}' already exists under the specified parent category.`,
      409,
    );
  }
  // Collect data for insertion
  const data = await ShoppingMallCategoryCollector.collect({
    body: props.body,
  });
  // Create new category using collected data
  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data,
    ...ShoppingMallCategoryTransformer.select(),
  });
  // Transform and return created category
  return await ShoppingMallCategoryTransformer.transform(created);
}
