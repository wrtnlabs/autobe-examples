import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallInventoryHistoryAtInvertTransformer {
  export type Payload = Prisma.shopping_mall_inventory_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_seller_id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        metadata: true,
        variant: {
          select: {
            id: true,
            sku_code: true,
            price_override: true,
            stock_quantity: true,
            shopping_mall_product_id: true,
            optionValues: {
              select: {
                option_name: true,
                option_value: true,
              },
            } satisfies Prisma.shopping_mall_product_variant_option_valuesFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindFirstArgs,
        seller: {
          select: {
            id: true,
            shop_name: true,
            approval_status: true,
            created_at: true,
          },
        } satisfies Prisma.shopping_mall_sellersFindFirstArgs,
      },
    } satisfies Prisma.shopping_mall_inventory_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryHistory.IInvert> {
    return {
      id: input.id,
      shoppingMallProductVariantId: input.shopping_mall_product_variant_id,
      quantityChange: input.quantity_change,
      reason: input.reason as IShoppingMallInventoryHistory.IInvert["reason"],
      createdAt: input.created_at.toISOString(),
      metadata: input.metadata ?? undefined,
      variant: {
        id: input.variant.id,
        sku_code: input.variant.sku_code,
        price_override: input.variant.price_override ?? null,
        stock_quantity: input.variant.stock_quantity,
        shopping_mall_product_id: input.variant.shopping_mall_product_id,
        shoppingMallProductVariantOptionValues: input.variant.optionValues.map(
          (opt) => ({
            option_name: opt.option_name,
            option_value: opt.option_value,
          }),
        ),
      },
      seller: input.seller
        ? {
            id: input.seller.id,
            shop_name: input.seller.shop_name,
            approval_status: input.seller.approval_status,
            created_at: input.seller.created_at.toISOString(),
          }
        : null,
    };
  }
}
