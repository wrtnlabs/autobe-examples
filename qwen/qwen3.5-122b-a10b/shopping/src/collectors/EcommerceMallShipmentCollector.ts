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
    ecommerceMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      tracking_number: props.body.trackingNumber,
      carrier_name: props.body.carrierName,
      shipped_at: props.body.shippedAt
        ? new Date(props.body.shippedAt)
        : new Date(),
      delivered_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.ecommerceMallSellers.id } },
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}
