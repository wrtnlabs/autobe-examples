import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductCategoriesParentIdChildren(props: {
  admin: AdminPayload;
  parentId: string & tags.Format<"uuid">;
  body: IShoppingMallProductCategory.ICreate;
}): Promise<IShoppingMallProductCategory> {
  const { admin, parentId, body } = props;

  // Check parent category exists and not deleted
  const parent =
    await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
      where: { id: parentId, deleted_at: null },
    });
  if (!parent) {
    throw new HttpException("Parent category not found", 404);
  }

  // Check uniqueness of child category name among siblings, excluding deleted
  const existing =
    await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
      where: {
        parent_id: parentId,
        name: body.name,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      "Child category name already exists under this parent",
      409,
    );
  }

  // Prepare new category data
  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_product_categories.create(
    {
      data: {
        id: newId,
        parent_id: parentId,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Return with correct date conversions
  return {
    id: created.id,
    parent_id: created.parent_id ?? undefined,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
