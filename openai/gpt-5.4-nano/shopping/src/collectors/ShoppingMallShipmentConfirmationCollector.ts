import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShipmentConfirmationCollector {
  export async function collect(props: {
    body: IShoppingMallShipmentConfirmation.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      confirmation_type: props.body.confirmationType,
      confirmed_at: new Date(props.body.confirmedAt),
      tracking_url: props.body.trackingUrl ?? null,
      tracking_number: props.body.trackingNumber ?? null,
      carrier_name: props.body.carrierName ?? null,
      note: props.body.note ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: { connect: { id: props.body.shoppingMallShipmentId } },
    } satisfies Prisma.shopping_mall_shipment_confirmationsCreateInput;
  }
}
