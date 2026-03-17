import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallProductVariantOptionTransformer } from "./ShoppingMallProductVariantOptionTransformer";

export namespace ShoppingMallCartItemTransformer {
  export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        available: true,
        created_at: true,
        updated_at: true,
        cart: true,
        variant: {
          select: {
            id: true,
            deleted: true,
            created_at: true,
            deleted_at: true,
            updated_at: true,
            shopping_mall_product_id: true,
            sku_code: true,
            price: true,
            stock_quantity: true,
            product: ShoppingMallProductAtSummaryTransformer.select(),
            options: ShoppingMallProductVariantOptionTransformer.select(),
          },
        },
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      available: input.available,
      subtotal:
        (input.variant.price ?? input.variant.product.base_price) *
        input.quantity,
      stockWarning: input.variant.stock_quantity < input.quantity,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.variant.product,
      ),
      variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
