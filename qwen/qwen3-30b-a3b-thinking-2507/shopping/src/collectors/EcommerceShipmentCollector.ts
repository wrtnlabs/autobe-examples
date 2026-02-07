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
    ecommerceOrders: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      carrier: props.body.carrier,
      tracking_number: props.body.tracking_number,
      shipping_date: new Date(props.body.shipping_date),
      estimated_delivery_date: null,
      actual_delivery_date: null,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.ecommerceOrders.id } },
    } satisfies Prisma.ecommerce_shipmentsCreateInput;
  }
}
