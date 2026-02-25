import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShippingCarrierCollector {
  export async function collect(props: {
    body: IShoppingMallShippingCarrier.ICreate;
  }) {
    return {
      id: v4(),
      code: props.body.code,
      name: props.body.name,
      api_endpoint: props.body.api_endpoint,
      api_key: props.body.api_key,
      api_secret: props.body.api_secret,
      account_number: props.body.account_number ?? null,
      is_enabled: props.body.is_enabled,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      configs: undefined,
    } satisfies Prisma.shopping_mall_shipping_carriersCreateInput;
  }
}
