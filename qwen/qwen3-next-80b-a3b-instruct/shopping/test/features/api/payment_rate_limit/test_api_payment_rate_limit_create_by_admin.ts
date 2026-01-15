import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRateLimit";
import { prepare_random_shopping_mall_payment_rate_limit } from "../../../prepare/prepare_random_shopping_mall_payment_rate_limit";
import { generate_random_shopping_mall_admin_payment_rate_limits_create } from "../../../generate/generate_random_shopping_mall_admin_payment_rate_limits_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_rate_limit_create_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Create payment rate limit configuration with valid data
  const rateLimit: IShoppingMallPaymentRateLimit.ICreate = {
    paymentMethod: "credit_card",
    currency: "USD",
    region: "US",
    maxTransactions: 100,
    durationSeconds: 3600,
    enabled: true,
    description: "Limit credit card transactions to 100 per hour for US region",
  } satisfies IShoppingMallPaymentRateLimit.ICreate;
  // Create payment rate limit via utility function
  const createdRateLimit =
    await generate_random_shopping_mall_admin_payment_rate_limits_create(
      adminConnection,
      { body: rateLimit },
    );
  typia.assert(createdRateLimit);
  // Validate creation response matches request
  TestValidator.equals(
    "payment method matches",
    createdRateLimit.paymentMethod,
    "credit_card",
  );
  TestValidator.equals("currency matches", createdRateLimit.currency, "USD");
  TestValidator.equals("region matches", createdRateLimit.region, "US");
  TestValidator.equals(
    "max transactions matches",
    createdRateLimit.maxTransactions,
    100,
  );
  TestValidator.equals(
    "duration seconds matches",
    createdRateLimit.durationSeconds,
    3600,
  );
  TestValidator.equals(
    "enabled status matches",
    createdRateLimit.enabled,
    true,
  );
  // Remove invalid property access: 'description' does not exist on IShoppingMallPaymentRateLimit
  // Remove invalid property access: 'id' does not exist on IShoppingMallPaymentRateLimit
  // Validate entire response type with typia.assert
  typia.assert<IShoppingMallPaymentRateLimit>(createdRateLimit);
}