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

export async function getShoppingMallSellerProductCategoriesId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductCategory> {
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUniqueOrThrow({
      where: { id: props.id },
    });

  return {
    id: category.id,
    parent_id:
      category.parent_id === undefined ? undefined : category.parent_id,
    name: category.name,
    description: category.description ?? null,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at:
      category.deleted_at === null || category.deleted_at === undefined
        ? undefined
        : toISOStringSafe(category.deleted_at),
  };
}
