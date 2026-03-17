import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallShipmentDeliveryCollector {
  export async function collect(props: {
    body: IEcommerceMallShipmentDelivery.ICreate;
    shipment: IEntity;
    customer: IEntity;
  }) {
    return {
      id: v4(),
      delivered_at: new Date(),
      is_auto_delivered: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: { connect: { id: props.shipment.id } },
      customer: { connect: { id: props.customer.id } },
    } satisfies Prisma.ecommerce_mall_shipment_deliveriesCreateInput;
  }
}
