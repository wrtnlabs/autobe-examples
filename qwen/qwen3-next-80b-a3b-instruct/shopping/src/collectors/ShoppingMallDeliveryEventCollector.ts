import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallDeliveryEventCollector {
  export async function collect(props: {
    body: IShoppingMallDeliveryEvent.ICreate;
    shoppingMallOrders: IEntity;
    shoppingMallCarriers: IEntity;
  }) {
    return {
      id: v4(),
      status: props.body.status,
      status_time: new Date(),
      carrier_update: props.body.tracking_number,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      orderShipment: {
        connect: { id: props.shoppingMallOrders.id },
      },
    } satisfies Prisma.shopping_mall_delivery_eventsCreateInput;
  }
}
