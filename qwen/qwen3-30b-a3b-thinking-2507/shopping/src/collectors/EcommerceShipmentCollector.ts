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
    const id = v4();
    const shipmentDate = new Date();
    const expectedDeliveryDate = new Date(
      shipmentDate.getTime() + 3 * 24 * 60 * 60 * 1000,
    );
    return {
      id,
      carrier_name: props.body.carrier_name,
      tracking_number: props.body.tracking_number,
      status: "pending",
      shipment_date: shipmentDate,
      expected_delivery_date: expectedDeliveryDate,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.ecommerceOrders.id } },
    } satisfies Prisma.ecommerce_shipmentsCreateInput;
  }
}
