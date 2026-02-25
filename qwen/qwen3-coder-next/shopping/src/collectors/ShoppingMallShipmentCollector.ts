import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShipmentCollector {
  export async function collect(props: {
    body: IShoppingMallShipment.ICreate;
    shoppingMallOrders: IEntity;
    shoppingMallSellers: IEntity;
  }) {
    return {
      id: v4(),
      tracking_number: props.body.tracking_number,
      tracking_carrier: props.body.tracking_carrier,
      status: "pending",
      shipped_at: new Date(),
      customer_confirmed_at: null,
      auto_confirmed_at: null,
      cancelled_at: null,
      order: { connect: { id: props.shoppingMallOrders.id } },
      seller: { connect: { id: props.shoppingMallSellers.id } },
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
