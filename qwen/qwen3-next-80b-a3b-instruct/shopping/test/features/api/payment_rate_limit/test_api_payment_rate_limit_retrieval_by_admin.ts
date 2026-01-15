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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_rate_limit_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Step 2: Generate a valid UUID for rate limit retrieval (existing or non-existing)
  // Note: We cannot create rate limits programatically, so we test retrieval of an existing one
  const rateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the specific rate limit by ID
  const retrievedRateLimit: IShoppingMallPaymentRateLimit =
    await api.functional.shoppingMall.admin.payment_rate_limits.at(
      adminConnection,
      {
        rateLimitId,
      },
    );
  typia.assert(retrievedRateLimit);
  // Step 4: Validate that all expected fields are present and correct
  TestValidator.equals(
    "paymentMethod is present",
    typeof retrievedRateLimit.paymentMethod,
    "string",
  );
  TestValidator.equals(
    "currency is present",
    typeof retrievedRateLimit.currency,
    "string",
  );
  TestValidator.equals(
    "region is present",
    typeof retrievedRateLimit.region,
    "string",
  );
  TestValidator.equals(
    "maxTransactions is present",
    typeof retrievedRateLimit.maxTransactions,
    "number",
  );
  TestValidator.equals(
    "durationSeconds is present",
    typeof retrievedRateLimit.durationSeconds,
    "number",
  );
  TestValidator.equals(
    "enabled is present",
    typeof retrievedRateLimit.enabled,
    "boolean",
  );
  // Step 5: Test unauthorized access (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.shoppingMall.admin.payment_rate_limits.at(
      guestConnection,
      {
        rateLimitId,
      },
    );
  });
}
