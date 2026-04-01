import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallOrderItemTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: { select: { id: true } },
        product: {
          select: {
            id: true,
            base_price: true,
            variants: {
              select: {
                price_override: true,
              },
            } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
          },
        },
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        snapshot: { select: { id: true } },
        shipmentItem: { select: { id: true } },
        cancellationRequests: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs,
        refundRequests: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem> {
    const variantPrices = input.product.variants
      .map((v) => v.price_override)
      .filter((p): p is number => p !== null);
    const minPrice =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : input.product.base_price;
    const maxPrice =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : input.product.base_price;
    return {
      id: input.id,
      quantity: input.quantity,
      price: input.price,
      status: input.status,
      product: {
        min: minPrice,
        max: maxPrice,
      } satisfies IShoppingMallProduct.ISummary,
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
