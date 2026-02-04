import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        total_price: true,
        payment_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        shippingAddress: true,
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrder.ISummary> {
    // Map payment_status to status string
    let status: string | null = null;
    if (input.payment_status === "paid") status = "paid";
    else if (input.payment_status === "shipped") status = "shipped";
    else if (input.payment_status === "delivered") status = "delivered";
    else if (input.payment_status === "cancelled") status = "cancelled";
    else if (input.payment_status === "refunded") status = "refunded";
    else if (input.payment_status === "partially_completed")
      status = "partially_completed";
    // Create orderNumber: 'ORD-YYYYMMDD-NNNN'
    const dateStr = toISOStringSafe(input.created_at)
      .substring(0, 10)
      .replace(/-/g, "");
    // Simple hash from id for NNNN segment
    const hash =
      Math.abs(
        input.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0),
      ) % 10000;
    const orderNumber = `ORD-${dateStr}-${hash.toString().padStart(4, "0")}`;
    return {
      status,
      id: input.id,
      orderNumber,
      totalPrice: Number(input.total_price),
    };
  }
}
