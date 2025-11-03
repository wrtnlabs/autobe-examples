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

export async function putShoppingMallAdminProductCategoriesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallProductCategory.IUpdate;
}): Promise<IShoppingMallProductCategory> {
  const { admin, id, body } = props;

  // Verify existence and that category is not soft-deleted
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUniqueOrThrow({
      where: { id },
    });
  if (category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }

  // Check for sibling category with same name and parent_id, excluding self
  const siblingCategory =
    await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
      where: {
        name: body.name,
        parent_id: body.parent_id ?? null,
        deleted_at: null,
        NOT: { id },
      },
    });
  if (siblingCategory !== null) {
    throw new HttpException(
      "Duplicate category name under the same parent",
      409,
    );
  }

  // Perform update with provided fields
  const updated = await MyGlobal.prisma.shopping_mall_product_categories.update(
    {
      where: { id },
      data: {
        name: body.name,
        description: body.description ?? null,
        parent_id: body.parent_id ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  // Return formatted updated category
  return {
    id: updated.id,
    parent_id: updated.parent_id ?? null,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
