import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentCollector {
  export async function collect(props: {
    body: IShoppingMallPayment.ICreate;
    shoppingMallOrders: IEntity;
    shoppingMallPaymentMethods: IEntity;
  }) {
    const paymentIntentId = props.body.payment_intent_id;
    const paymentIntent = paymentIntentId
      ? { connect: { id: paymentIntentId } }
      : {
          create: {
            id: v4(),
            intent_id: v4(),
            currency: props.body.currency,
            amount: props.body.amount,
            status: "pending",
            created_at: new Date(),
            updated_at: new Date(),
          },
        };
    return {
      id: v4(),
      amount: props.body.amount,
      currency: props.body.currency,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      paymentIntent,
      shopping_mall_payment_refunds: undefined,
      shopping_mall_payment_reconciliation: undefined,
      shopping_mall_payment_disputes: undefined,
      shopping_mall_payment_cryptocurrency_conversions: undefined,
    } satisfies Prisma.shopping_mall_paymentsCreateInput;
  }
}
