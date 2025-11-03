import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function getShoppingMallProductCategoriesParentIdChildrenChildId(props: {
  parentId: string & tags.Format<"uuid">;
  childId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductCategory> {
  const { parentId, childId } = props;

  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findFirstOrThrow({
      where: {
        id: childId,
        parent_id: parentId,
        deleted_at: null,
      },
    });

  return {
    id: category.id,
    parent_id: category.parent_id ?? undefined,
    name: category.name,
    description: category.description ?? null,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : null,
  };
}
