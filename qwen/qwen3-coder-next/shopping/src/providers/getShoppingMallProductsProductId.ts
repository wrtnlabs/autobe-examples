import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductId(props: {
  productId: string;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    include: {
      seller: true,
      variants: true,
      images: {
        orderBy: {
          display_order: "asc",
        },
      },
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  return {
    id: product.id,
    shopping_mall_seller_id: product.shopping_mall_seller_id,
    shopping_mall_subcategory_id: product.shopping_mall_subcategory_id,
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    status: product.status,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    seller: {
      id: product.seller.id,
      email: product.seller.email,
      password_hash: product.seller.password_hash,
      shop_name: product.seller.shop_name,
      shop_description: product.seller.shop_description,
      logo_image_id: product.seller.logo_image_id,
      status: product.seller.status,
      rejection_reason: product.seller.rejection_reason,
      created_at: toISOStringSafe(product.seller.created_at),
      updated_at: toISOStringSafe(product.seller.updated_at),
      deleted_at: product.seller.deleted_at
        ? toISOStringSafe(product.seller.deleted_at)
        : null,
    },
    variants: product.variants.map((variant) => ({
      id: variant.id,
      shopping_mall_product_id: variant.shopping_mall_product_id,
      sku: variant.sku,
      option_values: variant.option_values,
      price_override: variant.price_override ?? null,
      stock_quantity: variant.stock_quantity,
      is_active: variant.is_active,
      created_at: toISOStringSafe(variant.created_at),
      updated_at: toISOStringSafe(variant.updated_at),
      deleted_at: variant.deleted_at
        ? toISOStringSafe(variant.deleted_at)
        : null,
    })),
    images: product.images.map((image) => ({
      id: image.id,
      shopping_mall_product_id: image.shopping_mall_product_id,
      display_order: image.display_order,
      image_url: image.image_url,
    })),
  };
}
