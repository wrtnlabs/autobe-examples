import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDeliveryConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderDeliveryConfirmationAtResponseTransformer {
  export type Payload =
    Prisma.shopping_mall_order_delivery_confirmationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        confirmed_by_ip: true,
        referrer: true,
        customer_confirmed_at: true,
        auto_confirmed_at: true,
        created_at: true,
        orderItem: true,
        shipment: true,
      },
    } satisfies Prisma.shopping_mall_order_delivery_confirmationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderDeliveryConfirmation.IResponse> {
    const dateValue = input.customer_confirmed_at ?? input.auto_confirmed_at;
    const confirmedAt =
      dateValue !== null && dateValue !== undefined
        ? toISOStringSafe(dateValue)
        : "";
    return {
      shipment_id: input.shipment.id,
      order_item_id: input.orderItem.id,
      confirmed_at: confirmedAt,
    };
  }
}
