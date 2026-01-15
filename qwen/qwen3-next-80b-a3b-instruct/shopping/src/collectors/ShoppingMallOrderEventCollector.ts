import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderEvent";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderEventCollector {
  export async function collect(props: {
    body: IShoppingMallOrderEvent.ICreate;
    shoppingMallOrders: IEntity;
  }) {
    return {
      id: v4(),
      status: "created",
      actor_type: "customer",
      details: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: {
        connect: { id: props.shoppingMallOrders.id },
      },
    } satisfies Prisma.shopping_mall_order_eventsCreateInput;
  }
}
