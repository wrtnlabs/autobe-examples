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
      confirmed_at: props.body.confirmedAt
        ? new Date(props.body.confirmedAt)
        : new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: { connect: { id: props.body.shoppingMallShipmentId } },
    } satisfies Prisma.shopping_mall_shipment_confirmationsCreateInput;
  }
}
