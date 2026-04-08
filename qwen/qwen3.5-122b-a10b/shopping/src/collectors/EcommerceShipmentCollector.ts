import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceShipmentCollector {
  export async function collect(props: {
    body: IEcommerceShipment.ICreate;
    order: IEntity;
    seller: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      carrier_name: props.body.carrier_name,
      tracking_number: props.body.tracking_number,
      tracking_url: props.body.tracking_url ?? null,
      shipped_at: now,
      delivered_at: null,
      status: "shipped",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      order: { connect: { id: props.order.id } },
      seller: { connect: { id: props.seller.id } },
      shipmentItems: {
        create: await ArrayUtil.asyncMap(
          props.body.order_item_ids,
          async (order_item_id) => {
            const itemNow = new Date();
            return {
              id: v4(),
              orderItem: { connect: { id: order_item_id } },
              created_at: itemNow,
              updated_at: itemNow,
            };
          },
        ),
      },
    } satisfies Prisma.ecommerce_shipmentsCreateInput;
  }
}
