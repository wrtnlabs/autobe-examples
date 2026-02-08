import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShipmentTrackingCollector {
  export async function collect(props: {
    body: IShoppingMallShipmentTracking.ICreate;
    shipment: IEntity;
    carrier_name: string;
    tracking_number: string;
  }) {
    const id: string = v4();
    return {
      id,
      carrier_name: props.carrier_name,
      tracking_number: props.tracking_number,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: { connect: { id: props.shipment.id } },
    } satisfies Prisma.shopping_mall_shipment_trackingsCreateInput;
  }
}
