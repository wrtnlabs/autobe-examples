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
  // Validate parent category if provided - must exist and be top-level (not a subcategory)
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.parent_id },
      select: { id: true, parent_id: true },
    });
    if (parent === null) {
      throw new HttpException("Parent category not found", 404);
    }
    // Enforce one-level nesting: parent cannot be a subcategory itself
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Cannot create subcategory of a subcategory. Only one-level nesting allowed.",
        400,
      );
    }
  }
  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: await ShoppingMallCategoryCollector.collect({
      body: props.body,
    }),
    ...ShoppingMallCategoryTransformer.select(),
  });
  return await ShoppingMallCategoryTransformer.transform(created);
}
