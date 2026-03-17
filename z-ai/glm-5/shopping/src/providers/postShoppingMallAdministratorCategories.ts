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
  // Check for duplicate category name
  const existing = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Category with this name already exists", 409);
  }
  // Validate parent if provided
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.parent_id },
      select: { id: true, parent_id: true, deleted_at: true },
    });
    if (parent === null || parent.deleted_at !== null) {
      throw new HttpException("Parent category not found", 404);
    }
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Cannot create subcategory under another subcategory. Only one level of nesting is permitted.",
        400,
      );
    }
  }
  // Create category using Collector
  await MyGlobal.prisma.shopping_mall_categories.create({
    data: await ShoppingMallCategoryCollector.collect({
      body: props.body,
    }),
  });
  // Fetch and transform response
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { name: props.body.name },
      ...ShoppingMallCategoryTransformer.select(),
    });
  return await ShoppingMallCategoryTransformer.transform(category);
}
