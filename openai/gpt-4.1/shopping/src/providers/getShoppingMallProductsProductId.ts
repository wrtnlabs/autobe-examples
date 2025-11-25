import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function getShoppingMallProductsProductId(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  // Lookup product by ID, include seller and join table rows
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    include: {
      seller: true,
      shopping_mall_products_categories: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Seller summary
  const sellerSummary = {
    id: product.seller.id,
    business_name: product.seller.business_name,
  };

  // Primary categories array
  const primaryCategories = product.shopping_mall_products_categories.map(
    (pc) => {
      const cat = pc.category;
      return {
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id === null ? undefined : cat.parent_id,
        description: cat.description,
        status: cat.status,
        sort_order: cat.sort_order,
        updated_at: toISOStringSafe(cat.updated_at),
        deleted_at: cat.deleted_at
          ? toISOStringSafe(cat.deleted_at)
          : undefined,
      };
    },
  );

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: sellerSummary,
    primary_categories: primaryCategories,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at: product.deleted_at ? toISOStringSafe(product.deleted_at) : null,
  };
}
