import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShippingMethodCollector {
  export async function collect(props: {
    body: IShoppingMallShippingMethod.ICreate;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      cost: props.body.cost_flat,
      estimated_delivery_days: props.body.delivery_days_min,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.shopping_mall_shipping_methodsCreateInput;
  }
}
