import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryAtTreeTransformer } from "../transformers/EcommerceMallCategoryAtTreeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCategoriesTree(): Promise<IEcommerceMallCategory.ITree> {
  const rootCategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: {
        parent_id: null,
        is_active: true,
        deleted_at: null,
      },
      orderBy: {
        display_order: "asc",
      },
      ...EcommerceMallCategoryAtTreeTransformer.select(),
    });
  if (rootCategories.length === 0) {
    throw new HttpException("Not found", 404);
  }
  return await EcommerceMallCategoryAtTreeTransformer.transform(
    rootCategories[0],
  );
}
