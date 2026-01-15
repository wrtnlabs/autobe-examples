import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCartItemTransformer {
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
        cart: {
          select: {
            id: true,
          },
        },
        productVariant: {
          select: {
            id: true,
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
      cart_id: input.cart.id,
      product_variant_id: input.productVariant.id,
      quantity: input.quantity,
      unit_price: input.price,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      cart_session_id: input.cart_session_id,
    };
  }
}
