import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingCategory.ICreate;
}): Promise<IShoppingCategory> {
  const now = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.shopping_categories.create({
      data: {
        id: v4(),
        category_tree_id: props.body.category_tree_id,
        parent_id: props.body.parent_id ?? null,
        category_code: props.body.category_code,
        category_name: props.body.category_name,
        sort_order: props.body.sort_order,
        description: props.body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      category_tree_id: created.category_tree_id,
      parent_id: created.parent_id ?? null,
      category_code: created.category_code,
      category_name: created.category_name,
      sort_order: created.sort_order,
      description: created.description ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint failed (category_code duplicate in tree)
      throw new HttpException(
        "Category code already exists in the specified category tree.",
        409,
      );
    }
    throw err;
  }
}
