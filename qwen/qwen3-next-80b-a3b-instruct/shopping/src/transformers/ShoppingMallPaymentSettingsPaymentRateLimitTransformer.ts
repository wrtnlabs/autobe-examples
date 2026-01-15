import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentSettingsPaymentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettingsPaymentRateLimit";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentSettingsPaymentRateLimitTransformer {
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
        user: true,
        maxTransactionsPerMinute: true,
        maxTransactionsPerHour: true,
        maxFailedTransactionsPerHour: true,
        maxAmountPerTransaction: true,
        maxAmountPerDay: true,
        blockDurationMinutes: true,
        alertThresholdPercentage: true,
        enableIPBasedRateLimiting: true,
        enableAccountBasedRateLimiting: true,
        enableExponentialBackoff: true,
        allowPremiumUsersOverride: true,
      },
    } satisfies Prisma.shopping_mall_payment_rate_limitsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentSettingsPaymentRateLimit> {
    return {
      maxTransactionsPerMinute: input.max_transactions_per_minute,
      maxTransactionsPerHour: input.max_transactions_per_hour,
      maxFailedTransactionsPerHour: input.max_failed_transactions_per_hour,
      maxAmountPerTransaction: input.max_amount_per_transaction,
      maxAmountPerDay: input.max_amount_per_day,
      blockDurationMinutes: input.block_duration_minutes,
      alertThresholdPercentage: input.alert_threshold_percentage,
      enableIPBasedRateLimiting: input.enable_ip_based_rate_limiting,
      enableAccountBasedRateLimiting: input.enable_account_based_rate_limiting,
      enableExponentialBackoff: input.enable_exponential_backoff,
      allowPremiumUsersOverride: input.allow_premium_users_override,
    };
  }
}
