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

export async function putShoppingMallAdminProductCategoriesParentIdChildrenChildId(props: {
  admin: AdminPayload;
  parentId: string & tags.Format<"uuid">;
  childId: string & tags.Format<"uuid">;
  body: IShoppingMallProductCategory.IUpdate;
}): Promise<IShoppingMallProductCategory> {
  const { admin, parentId, childId, body } = props;

  const parentCategory =
    await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
      where: { id: parentId, deleted_at: null },
    });
  if (!parentCategory)
    throw new HttpException("Parent category not found", 404);

  const childCategory =
    await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
      where: { id: childId, parent_id: parentId, deleted_at: null },
    });
  if (!childCategory)
    throw new HttpException(
      "Child category not found under specified parent",
      404,
    );

  if (body.name !== childCategory.name) {
    const conflictSibling =
      await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
        where: {
          parent_id: parentId,
          name: body.name,
          deleted_at: null,
          NOT: { id: childId },
        },
      });
    if (conflictSibling)
      throw new HttpException("Duplicate category name among siblings", 409);
  }

  if (
    body.parent_id !== undefined &&
    body.parent_id !== null &&
    body.parent_id === childId
  ) {
    throw new HttpException(
      "Invalid parent_id: cannot be the same as child id",
      400,
    );
  }

  const updateData: IShoppingMallProductCategory.IUpdate = {
    name: body.name,
    description: body.description ?? null,
  };

  if (Object.prototype.hasOwnProperty.call(body, "parent_id")) {
    updateData.parent_id = body.parent_id ?? null;
  }

  const updated = await MyGlobal.prisma.shopping_mall_product_categories.update(
    {
      where: { id: childId },
      data: updateData,
    },
  );

  return {
    id: updated.id,
    parent_id: updated.parent_id ?? null,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
