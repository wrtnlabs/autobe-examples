import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRateLimit";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentRateLimitCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentRateLimit.ICreate;
  }) {
    return {
      id: v4(),
      ip: "0.0.0.0",
      attempts: 0,
      created_at: new Date(),
      expired_at: new Date(),
      user: undefined,
      paymentMethod: props.body.paymentMethod,
      currency_code: props.body.currency,
      region_code: props.body.region,
      max_transactions: props.body.maxTransactions,
      duration_seconds: props.body.durationSeconds,
      enabled: props.body.enabled,
    } satisfies Prisma.shopping_mall_payment_rate_limitsCreateInput;
  }
}
