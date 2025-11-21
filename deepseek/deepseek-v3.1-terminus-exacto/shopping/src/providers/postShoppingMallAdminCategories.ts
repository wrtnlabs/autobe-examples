import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  // Check if category name already exists
  const existingCategory =
    await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });

  if (existingCategory) {
    throw new HttpException("Category name already exists", 400);
  }

  // Validate parent category if provided
  if (props.body.parent_id) {
    const parentCategory =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          id: props.body.parent_id,
          deleted_at: null,
          active: true,
        },
      });

    if (!parentCategory) {
      throw new HttpException("Parent category not found or inactive", 400);
    }
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      display_order: props.body.display_order,
      active: props.body.active,
      parent_id: props.body.parent_id ?? null,
      created_at: now,
      updated_at: now,
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

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? undefined,
    display_order: created.display_order,
    active: created.active,
    parent: created.parent
      ? {
          id: created.parent.id,
          name: created.parent.name,
          description: created.parent.description ?? undefined,
          display_order: created.parent.display_order,
          active: created.parent.active,
          parent_id: created.parent.parent_id
            ? typia.assert<string & tags.Format<"uuid">>(
                created.parent.parent_id,
              )
            : typia.assert<string & tags.Format<"uuid">>(
                "00000000-0000-0000-0000-000000000000",
              ),
          created_at: toISOStringSafe(created.parent.created_at),
          updated_at: toISOStringSafe(created.parent.updated_at),
          parent: undefined,
        }
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  } satisfies IShoppingMallCategory as IShoppingMallCategory;
}
