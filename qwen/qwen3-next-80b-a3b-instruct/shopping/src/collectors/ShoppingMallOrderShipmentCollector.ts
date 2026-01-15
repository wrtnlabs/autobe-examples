import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderShipmentCollector {
  export async function collect(props: {
    body: IShoppingMallOrderShipment.ICreate;
  }) {
    // Query order table to get actual order.id from business order_code
    const order = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
      where: { order_code: props.body.orderCode },
    });
    return {
      // UUID generation for primary key
      id: v4(),
      // Direct field mappings
      tracking_number: props.body.trackingNumber ?? v4(),
      estimated_delivery_date: null,
      actual_delivery_date: null,
      package_weight: 0.0,
      package_dimensions: "0x0x0",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations - connect using indirect reference and direct ID
      order: { connect: { id: order.id } },
      carrier: { connect: { id: props.body.carrierId } },
      // HasMany relations - cannot create with current info
      shopping_mall_shipping_trackings: undefined,
      shopping_mall_delivery_events: undefined,
    } satisfies Prisma.shopping_mall_order_shipmentsCreateInput;
  }
}
