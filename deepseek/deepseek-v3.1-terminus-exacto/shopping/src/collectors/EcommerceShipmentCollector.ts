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
    seller: IEntity;
  }) {
    return {
      id: v4(),
      tracking_number: props.body.tracking_number,
      carrier_name: props.body.carrier_name,
      shipment_status: "created",
      created_at: new Date(),
      updated_at: new Date(),
      shipped_at: null,
      delivered_at: null,
      estimated_delivery: null,
      shipping_cost: props.body.shipping_cost ?? null,
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.ecommerce_shipmentsCreateInput;
  }
}
