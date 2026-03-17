import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentAttemptCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentAttempt.ICreate;
    customer: IEntity;
  }) {
    return {
      id: v4(),
      status: "pending",
      amount: props.body.amount,
      gateway_provider: props.body.gateway_provider,
      gateway_reference: "",
      failure_reason: null,
      processed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: {
        connect: {
          id: props.customer.id,
        },
      },
    } satisfies Prisma.shopping_mall_payment_attemptsCreateInput;
  }
}
