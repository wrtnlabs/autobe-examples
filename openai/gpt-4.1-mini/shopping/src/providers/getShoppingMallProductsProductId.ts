import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function getShoppingMallProductsProductId(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  const { productId } = props;
  try {
    const product =
      await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
        where: { id: productId },
        include: {
          category: true, // includes all fields of category, but not required in return
          seller: true, // includes all fields of seller
          shopping_mall_skus: true,
        },
      });

    return {
      id: product.id,
      shopping_mall_category_id: product.shopping_mall_category_id,
      shopping_mall_seller_id: product.shopping_mall_seller_id,
      code: product.code,
      name: product.name,
      description: product.description ?? null,
      status: product.status,
      created_at: toISOStringSafe(product.created_at),
      updated_at: toISOStringSafe(product.updated_at),
      deleted_at: product.deleted_at
        ? toISOStringSafe(product.deleted_at)
        : null,
    };
  } catch {
    throw new HttpException("Product not found", 404);
  }
}
