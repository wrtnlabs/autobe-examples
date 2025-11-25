import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function getShoppingMallCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCategory> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          description: true,
          display_order: true,
          active: true,
          parent_id: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  return {
    id: category.id,
    name: category.name,
    description: category.description ?? undefined,
    display_order: category.display_order,
    active: category.active,
    parent: category.parent
      ? {
          id: category.parent.id,
          name: category.parent.name,
          description: category.parent.description ?? undefined,
          display_order: category.parent.display_order,
          active: category.parent.active,
          parent_id:
            category.parent.parent_id !== null
              ? typia.assert<string & tags.Format<"uuid">>(
                  category.parent.parent_id,
                )
              : typia.random<string & tags.Format<"uuid">>(),
          created_at: toISOStringSafe(category.parent.created_at),
          updated_at: toISOStringSafe(category.parent.updated_at),
          parent: undefined,
        }
      : undefined,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : undefined,
  } satisfies IShoppingMallCategory as IShoppingMallCategory;
}
