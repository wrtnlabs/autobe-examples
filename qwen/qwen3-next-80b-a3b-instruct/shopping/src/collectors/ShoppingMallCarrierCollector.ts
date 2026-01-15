import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCarrierCollector {
  export async function collect(props: { body: IShoppingMallCarrier.ICreate }) {
    return {
      id: v4(),
      name: props.body.carrier_name,
      service_details: props.body.carrier_code,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.shopping_mall_carriersCreateInput;
  }
}
