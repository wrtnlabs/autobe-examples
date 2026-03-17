import { IEcommerceMallShipmentTrackingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingCode";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallShipmentTrackingCodeCollector {
  export async function collect(props: {
    body: IEcommerceMallShipmentTrackingCode.ICreate;
    ecommerceMallShipments: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      carrier_name: props.body.carrierName,
      tracking_code: props.body.trackingCode,
      created_at: new Date(),
      updated_at: new Date(),
      shipment: { connect: { id: props.ecommerceMallShipments.id } },
    } satisfies Prisma.ecommerce_mall_shipment_tracking_codesCreateInput;
  }
}
