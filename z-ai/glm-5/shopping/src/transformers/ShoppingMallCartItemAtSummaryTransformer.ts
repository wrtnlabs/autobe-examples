import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductVariantAtOptionTransformer } from "./ShoppingMallProductVariantAtOptionTransformer";

export namespace ShoppingMallCartItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        created_at: true,
        updated_at: true,
        variant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            product: ShoppingMallProductAtSummaryTransformer.select(),
            options: {
              select: {
                key: true,
                value: true,
              },
            } satisfies Prisma.shopping_mall_product_variant_optionsFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem.ISummary> {
    const product = await ShoppingMallProductAtSummaryTransformer.transform(
      input.variant.product,
    );
    const options = await ArrayUtil.asyncMap(
      input.variant.options,
      ShoppingMallProductVariantAtOptionTransformer.transform,
    );
    const currentStock = 0;
    return {
      id: input.id,
      quantity: input.quantity,
      unit_price: input.unit_price,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      variant: {
        id: input.variant.id,
        sku_code: input.variant.sku_code,
        price: input.variant.price,
        options,
        stock_quantity: currentStock,
        in_stock: currentStock > 0,
      } satisfies IShoppingMallProductVariant.ISummary,
      availability_status:
        currentStock === 0
          ? "unavailable"
          : currentStock < input.quantity
            ? "insufficient_stock"
            : "available",
      current_stock: currentStock,
      product,
      seller: product.seller!,
      subtotal: input.unit_price * input.quantity,
    };
  }
}
