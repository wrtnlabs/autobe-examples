import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentRefundCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentRefund.ICreate;
    payment: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      refund_amount: props.body.amount,
      refund_status: "pending",
      gateway_response_code: null,
      gateway_response_message: null,
      created_at: new Date(),
      refund_items: null,
      deleted_at: null,
      payment: {
        connect: { id: props.payment.id },
      },
      shopping_mall_payment_audit_logs: undefined,
    } satisfies Prisma.shopping_mall_payment_refundsCreateInput;
  }
}
