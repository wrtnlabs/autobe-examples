import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        total_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        customer: {
          select: { id: true },
        },
        shippingAddress: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallOrder> {
    return {
      id: input.id,
      total_price: Number(input.total_price),
      status: typia.assert<
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
        | "partially_completed"
      >(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      customer_id: input.customer.id,
      shipping_address_id: input.shippingAddress.id,
      items: "",
      shipments: "",
      statusHistory: "",
    };
  }
}
