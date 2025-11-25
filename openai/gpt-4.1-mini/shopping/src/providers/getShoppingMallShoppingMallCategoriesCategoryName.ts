import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function getShoppingMallShoppingMallCategoriesCategoryName(props: {
  categoryName: string;
}): Promise<IShoppingMallShoppingMallCategory> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { name: props.categoryName },
  });

  if (!category) {
    throw new HttpException(
      `Category with name '${props.categoryName}' not found.`,
      404,
    );
  }

  return {
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    status: category.status,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : null,
  };
}
