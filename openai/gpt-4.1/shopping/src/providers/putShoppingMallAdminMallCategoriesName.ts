import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminMallCategoriesName(props: {
  admin: AdminPayload;
  name: string;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  // Find existing category by name (unique constraint)
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { name: props.name },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Disallow attempts to update immutable system fields through body (enforced by type system)
  // But defensive code: if body (spread) happens to contain name/id/created_at/deleted_at, ignore those in update

  // If parent_id is present and not null, verify the referenced category exists
  let parentIdToSet = undefined;
  if ("parent_id" in props.body) {
    if (props.body.parent_id === null) {
      parentIdToSet = null;
    } else if (props.body.parent_id !== undefined) {
      // Verify referenced parent exists
      const parentCat =
        await MyGlobal.prisma.shopping_mall_categories.findUnique({
          where: { id: props.body.parent_id },
        });
      if (!parentCat) {
        throw new HttpException("Parent category does not exist", 400);
      }
      parentIdToSet = props.body.parent_id;
    }
  }

  // Only allow updates to description, sort_order, status, parent_id
  const updateFields: Record<string, unknown> = {};
  if (props.body.description !== undefined)
    updateFields.description = props.body.description;
  if (props.body.sort_order !== undefined)
    updateFields.sort_order = props.body.sort_order;
  if (props.body.status !== undefined) updateFields.status = props.body.status;
  if ("parent_id" in props.body) updateFields.parent_id = parentIdToSet;

  // Always update the audit timestamp
  updateFields.updated_at = new Date();

  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
    where: { name: props.name },
    data: updateFields,
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    sort_order: updated.sort_order,
    status: updated.status,
    parent_id: updated.parent_id === null ? null : updated.parent_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
