import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallCartItemTransformer {
  export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unavailable: true,
        created_at: true,
        updated_at: true,
        variant: {
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price: true,
            created_at: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                seller: ShoppingMallSellerAtSummaryTransformer.select(),
              },
            } satisfies Prisma.shopping_mall_productsFindManyArgs,
            inventoryRecords: {
              select: {
                quantity_change: true,
              },
            } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem> {
    const stockQuantity = input.variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    const price = input.variant.price ?? input.variant.product.base_price;
    const seller = await ShoppingMallSellerAtSummaryTransformer.transform(
      input.variant.product.seller,
    );
    const variant = {
      id: input.variant.id,
      product: {
        id: input.variant.product.id,
        name: input.variant.product.name,
        base_price: input.variant.product.base_price,
        min_price: input.variant.product.base_price,
        max_price: input.variant.product.base_price,
        thumbnail: undefined,
        average_rating: null,
        review_count: 0,
        seller,
        out_of_stock: stockQuantity === 0,
        created_at: input.variant.created_at.toISOString(),
      } as IShoppingMallProduct.ISummary,
      sku_code: input.variant.sku_code,
      option_values: JSON.parse(input.variant.option_values),
      price: input.variant.price ?? undefined,
      stock_quantity: stockQuantity,
      created_at: input.variant.created_at.toISOString(),
    } satisfies IShoppingMallProductVariant.ISummary;
    return {
      id: input.id,
      variant,
      product: {
        id: input.variant.product.id,
        name: input.variant.product.name,
        description: input.variant.product.description,
        base_price: input.variant.product.base_price,
      },
      seller: {
        id: seller.id,
        shop_name: seller.shop_name,
        logo_image: seller.logo_image ?? null,
      },
      quantity: input.quantity,
      price,
      subtotal: price * input.quantity,
      unavailable: input.unavailable,
      stock_warning: input.quantity > stockQuantity,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
