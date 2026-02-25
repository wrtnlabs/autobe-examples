import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantAtRestockTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        shoppingMallShoppingCartItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs,
        cartItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs,
        optionValues: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_variant_option_valuesFindManyArgs,
        inventoryHistories: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_inventory_historiesFindManyArgs,
        stock: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_variant_stocksFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant.IRestock> {
    return {
      quantity: input.stock_quantity,
      reason: "",
    };
  }
}
