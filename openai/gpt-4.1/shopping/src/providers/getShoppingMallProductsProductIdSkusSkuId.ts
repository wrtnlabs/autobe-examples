import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";

export async function getShoppingMallProductsProductIdSkusSkuId(props: {
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSku> {
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.skuId,
      product: {
        id: props.productId,
      },
      deleted_at: null,
    },
    include: {
      product: {
        include: {
          seller: true,
          shopping_mall_products_categories: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  if (!sku || !sku.product) {
    throw new HttpException("SKU or Product not found", 404);
  }

  const productSummary: IShoppingMallProduct.ISummary = {
    id: sku.product.id,
    title: sku.product.title,
    default_price: sku.product.default_price,
    business_status: sku.product.business_status,
    seller: {
      id: sku.product.seller.id,
      business_name: sku.product.seller.business_name,
    },
    categories: sku.product.shopping_mall_products_categories.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
    })),
    created_at: toISOStringSafe(sku.product.created_at),
  };

  return {
    id: sku.id,
    product: productSummary,
    sku_code: sku.sku_code,
    price: sku.price,
    stock: sku.stock,
    status: sku.status,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at:
      sku.deleted_at != null ? toISOStringSafe(sku.deleted_at) : undefined,
  };
}
