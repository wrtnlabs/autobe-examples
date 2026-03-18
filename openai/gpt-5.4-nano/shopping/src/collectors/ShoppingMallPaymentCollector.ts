import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentCollector {
  export async function collect(props: { body: IShoppingMallPayment.ICreate }) {
    return {
      id: v4(),
      amount: props.body.amount,
      currency: props.body.currency,
      provider: props.body.provider,
      provider_reference: props.body.provider_reference,
      status: "pending",
      paid_at: null,
      error_code: null,
      error_message: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Not created/linked here: orderForPayment is a reverse hasOne relation.
    } satisfies Prisma.shopping_mall_paymentsCreateInput;
  }
}
