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

export async function postShoppingMallAdminShoppingMallCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  const { body } = props;

  const existing = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      code: body.code,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException(`Category code '${body.code}' already exists`, 409);
  }

  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        id: body.parent_id,
        deleted_at: null,
      },
    });
    if (!parent) {
      throw new HttpException(
        `Parent category id '${body.parent_id}' does not exist or deleted`,
        400,
      );
    }
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: {
      id: v4(),
      parent_id: body.parent_id ?? undefined,
      code: body.code,
      name: body.name,
      description: body.description ?? undefined,
      display_order: body.display_order,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    parent_id: created.parent_id ?? null,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
