import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallVariantStocks } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantStocks";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerVariantStocksVariantId(props: {
  seller: SellerPayload;
  variantId: string;
}): Promise<IShoppingMallVariantStocks> {
  const stock =
    await MyGlobal.prisma.shopping_mall_variant_stocks.findUniqueOrThrow({
      where: { product_variant_id: props.variantId },
      select: {
        id: true,
        product_variant_id: true,
        current_quantity: true,
        created_at: true,
        updated_at: true,
        variant: {
          select: {
            id: true,
            sku_code: true,
            shopping_mall_product_id: true,
            price_override: true,
            stock_quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                is_deleted: true,
                shopping_mall_seller_id: true,
                shopping_mall_category_id: true,
              },
            },
          },
        },
      },
    });
  const variant = stock.variant;
  const product = variant.product;
  const transformed = {
    id: stock.id,
    product_variant_id: stock.product_variant_id,
    current_quantity: stock.current_quantity,
    created_at: stock.created_at.toISOString(),
    updated_at: stock.updated_at.toISOString(),
    variant: {
      id: variant.id,
      sku_code: variant.sku_code,
      shopping_mall_product_id: variant.shopping_mall_product_id,
      price_override: variant.price_override,
      stock_quantity: variant.stock_quantity,
      product: {
        id: product.id,
        name: product.name,
        base_price: product.base_price,
        is_deleted: product.is_deleted,
        seller: {
          id: product.shopping_mall_seller_id,
          shop_name: "",
          approval_status: "",
          created_at: new Date().toISOString(),
        },
        category: {
          id: product.shopping_mall_category_id,
          name: "",
          description: null,
          parent: null,
          subcategory_count: 0,
        },
        average_rating: 0,
      },
      shoppingMallProductVariantOptionValues: [],
    },
  } satisfies IShoppingMallVariantStocks;
  return transformed;
}
