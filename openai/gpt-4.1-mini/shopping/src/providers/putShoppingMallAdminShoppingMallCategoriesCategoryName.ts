import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallCategoriesCategoryName(props: {
  admin: AdminPayload;
  categoryName: string;
  body: IShoppingMallShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallShoppingMallCategory> {
  const updated = await MyGlobal.prisma.shopping_mall_categories
    .update({
      where: { name: props.categoryName },
      data: {
        name: props.body.name,
        description: props.body.description ?? null,
        status: props.body.status,
        updated_at: new Date(),
      },
    })
    .catch(() => {
      throw new HttpException("Category not found", 404);
    });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
