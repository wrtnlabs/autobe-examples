import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryCollector } from "../collectors/ShoppingMallCategoryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  // Validate parent_id if provided - must be a top-level category
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.parent_id },
      select: { id: true, parent_id: true },
    });
    if (parent === null) {
      throw new HttpException("Parent category not found", 422);
    }
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Only one level of subcategory nesting is allowed",
        422,
      );
    }
  }
  // Check for duplicate category name
  const existing = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { name: props.body.name },
  });
  if (existing !== null) {
    throw new HttpException("Category name already exists", 409);
  }
  // Create category using Collector
  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: await ShoppingMallCategoryCollector.collect({
      body: props.body,
    }),
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
  return {
    id: created.id,
    name: created.name,
    description: created.description,
    parent:
      created.parent !== null
        ? {
            id: created.parent.id,
            name: created.parent.name,
            description: created.parent.description,
            parent:
              created.parent.parent !== null
                ? {
                    id: created.parent.parent.id,
                    name: created.parent.parent.name,
                    description: created.parent.parent.description,
                    parent: null,
                    created_at: created.parent.parent.created_at.toISOString(),
                  }
                : null,
            created_at: created.parent.created_at.toISOString(),
          }
        : null,
    created_at: created.created_at.toISOString(),
    updated_at: created.updated_at.toISOString(),
    deleted_at: created.deleted_at?.toISOString() ?? null,
  };
}
