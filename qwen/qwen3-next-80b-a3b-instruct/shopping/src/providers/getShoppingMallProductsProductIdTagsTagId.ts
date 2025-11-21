import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function getShoppingMallProductsProductIdTagsTagId(props: {
  productId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductTag> {
  const tag = await MyGlobal.prisma.shopping_mall_product_tags.findUnique({
    where: {
      id: props.tagId,
      shopping_mall_product_tags_products: {
        some: {
          shopping_mall_product_id: props.productId,
        },
      },
    },
    include: {
      shopping_mall_product_tags_products: true,
    },
  });

  if (!tag) {
    throw new HttpException("Product-tag association not found", 404);
  }

  return typia.assert<IShoppingMallProductTag>({
    id: tag.id satisfies string as string,
    name: tag.name satisfies string as string,
    slug: tag.slug satisfies string as string,
    description: (tag.description ?? "") satisfies string as string,
    is_active: tag.is_active satisfies boolean as boolean,
    display_order: tag.display_order satisfies number as number,
    created_at: toISOStringSafe(tag.created_at) satisfies string as string,
    updated_at: toISOStringSafe(tag.updated_at) satisfies string as string,
  });
}
