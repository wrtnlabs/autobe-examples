import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryAtTreeTransformer } from "../transformers/ShoppingMallCategoryAtTreeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCategoriesTree(): Promise<
  IShoppingMallCategory.ITree[]
> {
  const categories = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: {
      parent_id: null,
      deleted_at: null,
    },
    ...ShoppingMallCategoryAtTreeTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    categories,
    ShoppingMallCategoryAtTreeTransformer.transform,
  );
}
