import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        total_price: true,
        created_at: true,
        items: {
          select: {
            status: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrder.ISummary> {
    return {
      id: input.id,
      orderNumber: input.order_number,
      totalPrice: input.total_price,
      createdAt: input.created_at.toISOString(),
      status: computeOrderStatus(input.items),
    };
  }
  function computeOrderStatus(
    items: Array<{
      status: string;
    }>,
  ): IShoppingMallOrder.ISummary["status"] {
    if (items.length === 0) {
      return "PAID";
    }
    const statuses = items.map((item) => item.status);
    const allSame = statuses.every((s) => s === statuses[0]);
    if (allSame) {
      switch (statuses[0]) {
        case "PAID":
          return "PAID";
        case "SHIPPED":
          return "SHIPPED";
        case "DELIVERED":
          return "DELIVERED";
        case "CANCELLED":
          return "CANCELLED";
        case "REFUNDED":
          return "REFUNDED";
        default:
          return "PARTIALLY_COMPLETED";
      }
    }
    return "PARTIALLY_COMPLETED";
  }
}
