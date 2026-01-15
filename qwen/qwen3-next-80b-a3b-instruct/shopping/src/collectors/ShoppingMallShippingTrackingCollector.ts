import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingTracking";
import { IShoppingMallPackageDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPackageDimensions";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShippingTrackingCollector {
  export async function collect(props: {
    body: IShoppingMallShippingTracking.ICreate;
    orderShipment: IEntity;
  }) {
    return {
      id: v4(),
      tracking_number: "",
      created_at: new Date(),
      updated_at: new Date(),
      orderShipment: {
        connect: { id: props.orderShipment.id },
      },
    } satisfies Prisma.shopping_mall_shipping_trackingsCreateInput;
  }
}
