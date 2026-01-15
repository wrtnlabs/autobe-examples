import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCartAtSummaryTransformer {
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
            quantity: true,
            unitPrice: true,
          },
        },
        shopping_mall_cart_sessions: true,
        shopping_mall_payment_intents: true,
        _count: {
          select: {
            shopping_mall_cart_items: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_cartsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCart.ISummary> {
    const status = input.deleted_at
      ? "inactive"
      : input.shopping_mall_cart_sessions
        ? "active"
        : "abandoned";
    return {
      id: input.id,
      customerId: input.customer?.id ?? "00000000-0000-0000-0000-000000000000",
      itemCount: input._count.shopping_mall_cart_items,
      totalValue: input.shopping_mall_cart_items.reduce(
        (sum, item) => sum + item.quantity * Number(item.unitPrice),
        0,
      ),
      status: status,
      itemsLastUpdated: toISOStringSafe(input.updated_at),
    };
  }
}
