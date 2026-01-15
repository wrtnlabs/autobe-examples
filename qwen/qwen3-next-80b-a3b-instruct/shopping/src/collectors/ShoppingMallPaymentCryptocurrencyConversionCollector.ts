import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentCryptocurrencyConversion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCryptocurrencyConversion";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentCryptocurrencyConversionCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentCryptocurrencyConversion.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      fiat_amount: props.body.amount,
      locked_exchange_rate: 0,
      customer_confirmed: true,
      settlement_outcome: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      payment: {
        connect: { id: props.body.paymentMethodId },
      },
    } satisfies Prisma.shopping_mall_payment_cryptocurrency_conversionsCreateInput;
  }
}
