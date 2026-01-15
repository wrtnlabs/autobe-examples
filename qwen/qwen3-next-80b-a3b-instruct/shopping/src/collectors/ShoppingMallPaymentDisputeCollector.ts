import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentDisputeCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentDispute.ICreate;
    shoppingMallPayments: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      dispute_status: "pending",
      dispute_reason: props.body.reason,
      dispute_description: props.body.reason,
      evidence_url: null,
      resolution_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      payment: {
        connect: { id: props.shoppingMallPayments.id },
      },
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      seller: undefined,
      assignee: undefined,
    } satisfies Prisma.shopping_mall_payment_disputesCreateInput;
  }
}
