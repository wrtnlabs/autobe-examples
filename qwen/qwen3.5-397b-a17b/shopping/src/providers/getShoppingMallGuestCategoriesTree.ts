import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ShoppingMallCategoryAtTreeTransformer } from "../transformers/ShoppingMallCategoryAtTreeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallGuestCategoriesTree(props: {
  guest: GuestPayload;
}): Promise<IShoppingMallCategory.ITree> {
  const categories = await MyGlobal.prisma.shopping_mall_categories.findMany({
    ...ShoppingMallCategoryAtTreeTransformer.select(),
    where: {
      parent_id: null,
      deleted_at: null,
    },
  });
  const tree =
    await ShoppingMallCategoryAtTreeTransformer.transformAll(categories);
  const first = tree.at(0);
  if (!first) {
    throw new HttpException("No categories found", 404);
  }
  return first;
}
