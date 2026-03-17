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
    shoppingMallSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      carrier: props.body.carrier,
      tracking_number: props.body.trackingNumber ?? null,
      shipped_at: props.body.shippedAt ? new Date(props.body.shippedAt) : null,
      estimated_delivery_at: props.body.estimatedDeliveryAt
        ? new Date(props.body.estimatedDeliveryAt)
        : null,
      delivered_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.shoppingMallOrders.id } },
      seller: { connect: { id: props.shoppingMallSellers.id } },
      shipmentItems: {
        create: props.body.orderItemIds.map((orderItemId) => ({
          id: v4(),
          orderItem: { connect: { id: orderItemId } },
          created_at: new Date(),
        })),
      },
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
