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

export async function putShoppingMallAdminShoppingMallProductCategoriesCategoryCode(props: {
  admin: AdminPayload;
  categoryCode: string;
  body: IShoppingMallProductCategory.IUpdate;
}): Promise<IShoppingMallProductCategory> {
  const existing =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { code: props.categoryCode },
    });

  if (!existing) {
    throw new HttpException("Product category not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_product_categories.update(
    {
      where: { code: props.categoryCode },
      data: {
        name: props.body.name ?? undefined,
        description: Object.prototype.hasOwnProperty.call(
          props.body,
          "description",
        )
          ? props.body.description
          : undefined,
        deleted_at: Object.prototype.hasOwnProperty.call(
          props.body,
          "deleted_at",
        )
          ? props.body.deleted_at
          : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: updated.created_at ? toISOStringSafe(updated.created_at) : null,
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    version: undefined,
  };
}
