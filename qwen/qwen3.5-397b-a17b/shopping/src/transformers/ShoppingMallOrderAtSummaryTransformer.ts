import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallOrderAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        ordered_at: true,
        recipient_name: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        orderItems: {
          select: {
            quantity: true,
            price: true,
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
      order_number: input.order_number,
      ordered_at: toISOStringSafe(input.ordered_at),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      recipient_name: input.recipient_name,
      order_items_count: input.orderItems.length,
      total_amount: input.orderItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.price),
        0,
      ),
      status: computeOrderStatus(
        input.orderItems.map((item) =>
          typia.assert<
            "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
          >(item.status),
        ),
      ),
    };
  }
  function computeOrderStatus(
    statuses: ("paid" | "shipped" | "delivered" | "cancelled" | "refunded")[],
  ): "paid" | "shipped" | "delivered" | "cancelled" | "refunded" {
    if (statuses.some((s) => s === "cancelled")) return "cancelled";
    if (statuses.some((s) => s === "refunded")) return "refunded";
    if (statuses.every((s) => s === "delivered")) return "delivered";
    if (statuses.every((s) => s === "shipped")) return "shipped";
    return "paid";
  }
}
