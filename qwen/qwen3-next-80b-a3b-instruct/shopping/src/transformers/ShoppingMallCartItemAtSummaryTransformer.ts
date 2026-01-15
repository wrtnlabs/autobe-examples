import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantAttributeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttributeSummary";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallCartAtSummaryTransformer } from "./ShoppingMallCartAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallCartItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        cart: ShoppingMallCartAtSummaryTransformer.select(),
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      price: input.price,
      total: input.price * input.quantity,
      product_id: input.productVariant.product.id,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.productVariant.product,
      ),
      variant_id: input.productVariant.id,
      variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      ),
      seller_id: input.productVariant.seller.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.productVariant.seller,
      ),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
