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

export async function getShoppingMallAdminProductCategoriesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductCategory> {
  const { id } = props;

  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUniqueOrThrow({
      where: {
        id,
        deleted_at: null,
      },
    });

  return {
    id: category.id,
    parent_id: category.parent_id ?? null,
    name: category.name,
    description: category.description ?? null,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: null,
  };
}
