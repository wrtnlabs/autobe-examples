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
    const id: string = v4();
    return {
      id,
      carrier_name: props.body.carrier_name,
      tracking_number: props.body.tracking_number,
      shipped_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      order: { connect: { id: props.shoppingMallOrders.id } },
      seller: { connect: { id: props.shoppingMallSellers.id } },
      shipmentItems: {
        create: await Promise.all(
          props.body.order_item_ids.map(async (order_item_id) => ({
            id: v4(),
            orderItem: { connect: { id: order_item_id } },
          })),
        ),
      },
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
