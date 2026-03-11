import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallShipmentCollector {
  export async function collect(props: {
    body: IEcommerceMallShipment.ICreate;
    ecommerceMallOrders: IEntity;
    ecommerceMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      carrier_name: props.body.carrier_name ?? null,
      tracking_number: props.body.tracking_number ?? null,
      order: { connect: { id: props.ecommerceMallOrders.id } },
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      shipmentItems: undefined,
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}
