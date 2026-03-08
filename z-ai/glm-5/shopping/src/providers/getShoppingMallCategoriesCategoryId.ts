import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCategory> {
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            parent: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
              },
            },
          },
        },
      },
    });
  const parent = category.parent;
  const grandparent = parent?.parent;
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    parent: parent
      ? {
          id: parent.id,
          name: parent.name,
          description: parent.description,
          created_at: parent.created_at.toISOString(),
          parent: grandparent
            ? {
                id: grandparent.id,
                name: grandparent.name,
                description: grandparent.description,
                created_at: grandparent.created_at.toISOString(),
                parent: null,
              }
            : null,
        }
      : null,
    created_at: category.created_at.toISOString(),
    updated_at: category.updated_at.toISOString(),
    deleted_at: category.deleted_at?.toISOString() ?? null,
  };
}
