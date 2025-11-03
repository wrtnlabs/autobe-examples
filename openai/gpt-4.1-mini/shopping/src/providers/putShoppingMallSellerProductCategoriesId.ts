import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductCategoriesId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallProductCategory.IUpdate;
}): Promise<IShoppingMallProductCategory> {
  const { seller, id, body } = props;

  // Step 1: Check existence and non-deleted status
  const existingCategory =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id },
    });

  if (!existingCategory || existingCategory.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Step 2: Check for duplicate name among siblings
  const siblingCount =
    await MyGlobal.prisma.shopping_mall_product_categories.count({
      where: {
        id: { not: id },
        parent_id: body.parent_id === null ? null : (body.parent_id ?? null),
        name: body.name,
        deleted_at: null,
      },
    });

  if (siblingCount > 0) {
    throw new HttpException(
      "Conflict: Duplicate category name among siblings",
      409,
    );
  }

  // Step 3: Update category with updated_at timestamp
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_categories.update(
    {
      where: { id },
      data: {
        name: body.name,
        description: body.description ?? null,
        parent_id: body.parent_id ?? null,
        updated_at: now,
      },
    },
  );

  // Step 4: Return updated category data
  return {
    id: updated.id,
    parent_id: updated.parent_id ?? null,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
