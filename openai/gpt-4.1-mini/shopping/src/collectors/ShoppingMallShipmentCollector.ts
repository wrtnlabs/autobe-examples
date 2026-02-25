import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(
  date: Date,
): string & import("typia/lib/tags").Format<"date-time"> {
  return date.toISOString() as string &
    import("typia/lib/tags").Format<"date-time">;
}
export namespace ShoppingMallShipmentCollector {
  export async function collect(props: {
    body: IShoppingMallShipment.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    const now = toISOStringSafe(new Date());
    return {
      id,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
      shipmentItems: props.body.orderItemIds.length
        ? {
            create: await Promise.all(
              props.body.orderItemIds.map(async (orderItemId) => ({
                id: v4(),
                order_item_id: orderItemId,
                created_at: now,
                updated_at: now,
                orderItem: { connect: { id: orderItemId } },
              })),
            ),
          }
        : undefined,
      shipmentOrderItems: undefined,
      shipmentTrackings: {
        create: {
          id: v4(),
          carrier_name: props.body.carrierName,
          tracking_number: props.body.trackingNumber,
          created_at: now,
          updated_at: now,
        },
      },
      shipmentConfirmations: undefined,
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
