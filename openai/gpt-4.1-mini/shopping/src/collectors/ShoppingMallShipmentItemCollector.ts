import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShipmentItemCollector {
  export async function collect(props: {
    body: IShoppingMallShipmentItem.ICreate;
  }) {
    const id = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: { connect: { id: props.body.shipmentId } },
      orderItem: { connect: { id: props.body.orderItemId } },
    } satisfies Prisma.shopping_mall_shipment_itemsCreateInput;
  }
}
