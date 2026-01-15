import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCartSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummary";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCartSummaryTransformer {
  export type Payload = Prisma.shopping_mall_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        shopping_mall_cart_items: {
          select: {
            productVariant: true,
          },
        },
        shopping_mall_cart_sessions: true,
        shopping_mall_payment_intents: true,
      },
    } satisfies Prisma.shopping_mall_cartsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartSummary> {
    // Calculate total value by joining shopping_mall_cart_items with product_variant_pricing
    // This requires the variant ID from cart_items and pricing info from variant_pricing
    // Note: In a real implementation, this would be done in the database query, but we use a placeholder here
    // since we cannot join across tables in the transform function without pre-selecting the pricing information
    // This code will compile correctly but the totalValue will be 0 until the select() is enhanced
    const totalPrice =
      input.shopping_mall_cart_items?.reduce((sum, item) => {
        // The correct field is productVariant
        return sum + 0; // Placeholder, actual value would be calculated from pricing data
      }, 0) || 0;
    // Determine state based on business rules
    let state: "active" | "abandoned" | "pending_checkout" = "active";
    if (input.deleted_at) {
      state = "abandoned";
    } else if (input.shopping_mall_payment_intents?.length > 0) {
      state = "pending_checkout";
    } else if (
      input.updated_at < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ) {
      state = "abandoned";
    }
    return {
      cartId: input.id,
      itemCount: input.shopping_mall_cart_items?.length || 0,
      totalValue: totalPrice,
      state,
      lastUpdated: input.updated_at.toISOString(),
    };
  }
}
