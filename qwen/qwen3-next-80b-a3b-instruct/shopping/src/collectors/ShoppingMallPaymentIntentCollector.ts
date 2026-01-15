import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntent";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentIntentCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentIntent.ICreate;
    shoppingMallCustomers: IEntity; // from authorized actor
    shoppingMallCustomerSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      currency: props.body.currency,
      amount: props.body.amount,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      paymentMethod: { connect: { id: props.body.payment_method_id } }, // CRITICAL: paymentMethod is required (nullable: false), so must use connect even if undefined
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      shopping_mall_payments: undefined,
      shopping_mall_payment_audit_logs: undefined,
      shopping_mall_payment_gateway_logs: undefined,
    } satisfies Prisma.shopping_mall_payment_intentsCreateInput;
  }
}
