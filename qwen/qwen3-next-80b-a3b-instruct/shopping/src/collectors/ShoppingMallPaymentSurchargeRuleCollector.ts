import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentSurchargeRuleCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentSurchargeRule.ICreate;
  }) {
    return {
      id: v4(),
      surcharge_amount: props.body.surcharge_amount ?? 0,
      effective_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      paymentMethod: {
        connect: { id: props.body.payment_method_id },
      },
      region: props.body.region_id
        ? {
            connect: { id: props.body.region_id },
          }
        : undefined,
    } satisfies Prisma.shopping_mall_payment_surcharge_rulesCreateInput;
  }
}
