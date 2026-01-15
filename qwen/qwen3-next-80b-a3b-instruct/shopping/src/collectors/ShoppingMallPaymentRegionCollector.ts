import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentRegionCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentRegion.ICreate;
  }) {
    return {
      id: v4(),
      country_code: props.body.region_code,
      currency_code: props.body.currency_code,
      paymentMethod: {
        connect: { id: props.body.primary_gateway },
      },
      shopping_mall_payment_surcharge_rules: undefined,
    } satisfies Prisma.shopping_mall_payment_regionsCreateInput;
  }
}
