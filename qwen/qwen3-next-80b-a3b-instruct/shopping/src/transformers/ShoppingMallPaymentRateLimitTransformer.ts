import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRateLimit";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentRateLimitTransformer {
  export type Payload = Prisma.shopping_mall_payment_rate_limitsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        attempts: true,
        created_at: true,
        expired_at: true,
        currency: true,
        user: {
          username: true,
        },
      },
    } satisfies Prisma.shopping_mall_payment_rate_limitsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentRateLimit> {
    return {
      paymentMethod: input.ip,
      currency: input.currency,
      region: input.user?.username ?? "GLOBAL",
      maxTransactions: input.attempts,
      durationSeconds: Math.floor(input.created_at.getTime() / 1000),
      enabled: input.expired_at > new Date(),
    };
  }
}
