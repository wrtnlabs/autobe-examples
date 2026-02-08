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

export async function putShoppingMallAdministratorProductCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductCategory.IUpdate;
}): Promise<IShoppingMallProductCategory> {
  const { categoryId, body } = props;
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: categoryId },
    });
  if (category === null || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // Check for name uniqueness excluding current category
  if ("name" in body && typeof body.name === "string") {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
        where: {
          name: body.name,
          id: { not: categoryId },
          deleted_at: null,
        },
      });
    if (duplicate !== null) {
      throw new HttpException("Category name already exists", 400);
    }
  }
  const now = toISOStringSafe(new Date()) satisfies string &
    tags.Format<"date-time">;
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.shopping_mall_product_categories.update({
      where: { id: categoryId },
      data: {
        name:
          "name" in body && typeof body.name === "string"
            ? body.name
            : category.name,
        description:
          "description" in body && typeof body.description === "string"
            ? body.description
            : category.description,
        updated_at: now,
      },
    });
  });
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
  };
}
