import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDeliveryAutoConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryAutoConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallDeliveryAutoConfirmationCollector {
  export async function collect(props: {
    body: IShoppingMallDeliveryAutoConfirmation.ICreate;
    shoppingMallShipments: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      confirmed_at: new Date(props.body.confirmed_at),
      auto_confirmed_by: props.body.auto_confirmed_by,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: { connect: { id: props.shoppingMallShipments.id } },
    } satisfies Prisma.shopping_mall_delivery_auto_confirmationsCreateInput;
  }
}
