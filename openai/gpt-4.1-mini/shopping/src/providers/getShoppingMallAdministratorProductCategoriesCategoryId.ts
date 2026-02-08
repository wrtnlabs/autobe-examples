import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductCategory> {
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!category || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    created_at: category.created_at,
    updated_at: category.updated_at,
    deleted_at: category.deleted_at,
  };
}
