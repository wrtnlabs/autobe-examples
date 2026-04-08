import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallMemberAtSummaryTransformer } from "./ShoppingMallMemberAtSummaryTransformer";

export namespace ShoppingMallOrderAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        total_price: true,
        created_at: true,
        member: ShoppingMallMemberAtSummaryTransformer.select(),
        orderItems: {
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
    const status = computeOrderStatus(input.orderItems);
    return {
      id: input.id,
      code: input.code,
      total_price: input.total_price,
      created_at: input.created_at.toISOString(),
      member: await ShoppingMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
      status: status,
      items_count: input.orderItems.length,
    } satisfies IShoppingMallOrder.ISummary;
  }
  function computeOrderStatus(
    orderItems: Array<{
      status: string;
    }>,
  ): string {
    if (orderItems.length === 0) {
      return "paid";
    }
    const hasCancelled = orderItems.some((item) => item.status === "cancelled");
    const hasRefunded = orderItems.some((item) => item.status === "refunded");
    const hasDelivered = orderItems.every(
      (item) => item.status === "delivered",
    );
    const hasShipped = orderItems.some((item) => item.status === "shipped");
    if (hasCancelled) {
      return "cancelled";
    }
    if (hasRefunded) {
      return "refunded";
    }
    if (hasDelivered) {
      return "delivered";
    }
    if (hasShipped) {
      return "shipped";
    }
    return "paid";
  }
}
