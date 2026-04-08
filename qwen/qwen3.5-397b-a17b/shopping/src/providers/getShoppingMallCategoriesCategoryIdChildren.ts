import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryAtSummaryTransformer } from "../transformers/ShoppingMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCategoriesCategoryIdChildren(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCategory.ISummary[]> {
  await MyGlobal.prisma.shopping_mall_categories.findFirstOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  const children = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: {
      parent_id: props.categoryId,
      deleted_at: null,
    },
    orderBy: { created_at: "asc" },
    ...ShoppingMallCategoryAtSummaryTransformer.select(),
  });
  return await ShoppingMallCategoryAtSummaryTransformer.transformAll(children);
}
