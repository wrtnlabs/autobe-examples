import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentExchangeRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentExchangeRate";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentExchangeRateCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentExchangeRate.ICreate;
  }) {
    return {
      id: v4(),
      from_currency: props.body.base_currency,
      to_currency: props.body.target_currency,
      exchange_rate: props.body.rate,
      source_api: "system",
      locked_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.shopping_mall_payment_exchange_ratesCreateInput;
  }
}
