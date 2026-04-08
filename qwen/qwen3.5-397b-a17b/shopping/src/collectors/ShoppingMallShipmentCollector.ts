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
      // Scalar fields
      id,
      carrier_name: props.body.carrier_name,
      tracking_number: props.body.tracking_number,
      shipped_at: new Date(),
      delivered_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      order: { connect: { id: props.shoppingMallOrders.id } },
      seller: { connect: { id: props.shoppingMallSellers.id } },
      // HasMany relations
      // orderItems is a reverse relation - order items reference shipments
      // via their own shopping_mall_shipment_id FK, so we cannot create
      // from the shipment side. Backend handles order item linkage separately.
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
