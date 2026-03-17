import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallTrackingInfoCollector } from "./ShoppingMallTrackingInfoCollector";

export namespace ShoppingMallShipmentCollector {
  export async function collect(props: {
    body: IShoppingMallShipment.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    const shipment: IEntity = { id };
    const now: Date = new Date();
    const autoDeliverAt: Date = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    const firstOrderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
        where: {
          id: props.body.orderItemIds[0],
        },
      });
    return {
      id,
      shipped_at: now,
      delivered_at: null,
      auto_deliver_at: autoDeliverAt,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      order: {
        connect: {
          id: firstOrderItem.shopping_mall_order_id,
        },
      },
      seller: {
        connect: {
          id: props.seller.id,
        },
      },
      trackingInfo: {
        create: await ShoppingMallTrackingInfoCollector.collect({
          body: props.body.trackingInfo,
          shipment,
        }),
      },
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
