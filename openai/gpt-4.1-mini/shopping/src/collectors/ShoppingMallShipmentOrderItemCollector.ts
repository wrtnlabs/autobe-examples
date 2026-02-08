import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShipmentOrderItemCollector {
  export async function collect(props: {
    body: IShoppingMallShipmentOrderItem.ICreate;
    shipment: IEntity;
    orderItem: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: { connect: { id: props.shipment.id } },
      orderItem: { connect: { id: props.orderItem.id } },
    } satisfies Prisma.shopping_mall_shipment_order_itemsCreateInput;
  }
}
