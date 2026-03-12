import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        status: true,
        total_price: true,
        created_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        orderItems: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrder.ISummary> {
    return {
      id: input.id,
      status: input.status,
      total_price: Number(input.total_price),
      order_items_count: input.orderItems.length,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
