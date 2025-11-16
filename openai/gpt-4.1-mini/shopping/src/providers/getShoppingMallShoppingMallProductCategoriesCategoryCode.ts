import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function getShoppingMallShoppingMallProductCategoriesCategoryCode(props: {
  categoryCode: string;
}): Promise<IShoppingMallProductCategory> {
  const found =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { code: props.categoryCode },
    });
  if (!found) {
    throw new HttpException(
      `Shopping mall product category with code '${props.categoryCode}' not found`,
      404,
    );
  }
  return {
    id: found.id,
    code: found.code,
    name: found.name,
    description: found.description ?? undefined,
    created_at: found.created_at ? toISOStringSafe(found.created_at) : null,
    updated_at: found.updated_at ? toISOStringSafe(found.updated_at) : null,
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
