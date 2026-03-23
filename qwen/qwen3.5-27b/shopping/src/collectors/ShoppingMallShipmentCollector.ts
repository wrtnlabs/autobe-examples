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
    shoppingMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      tracking_carrier: props.body.tracking_carrier,
      tracking_number: props.body.tracking_number,
      shipped_at: new Date(),
      delivered_at: null,
      delivery_confirmed: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.shoppingMallSellers.id } },
      shipmentItems: {
        create: await ArrayUtil.asyncMap(
          props.body.order_item_ids,
          async (orderItemId) => ({
            id: v4(),
            orderItem: { connect: { id: orderItemId } },
            created_at: new Date(),
          }),
        ),
      },
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
