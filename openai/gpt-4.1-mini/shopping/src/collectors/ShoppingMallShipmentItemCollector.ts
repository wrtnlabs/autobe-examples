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
    shipmentId: string;
    orderItemId: string;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: { connect: { id: props.shipmentId } },
      orderItem: { connect: { id: props.orderItemId } },
    } satisfies Prisma.shopping_mall_shipment_itemsCreateInput;
  }
}
