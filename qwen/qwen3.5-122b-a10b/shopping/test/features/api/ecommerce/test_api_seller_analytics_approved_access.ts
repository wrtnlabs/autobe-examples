import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAnalytic";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test approved seller analytics endpoint access and response validation.
 *
 * Validates that an approved seller can successfully access the platform-wide analytics endpoint and receive complete aggregated statistics. The test creates a seller account, authenticates as that seller, calls the analytics endpoint, and verifies the response structure and data integrity.
 *
 * The analytics endpoint returns comprehensive platform metrics including entity counts, status breakdowns, and pending request counts. All numeric values must be non-negative integers and the timestamp must be in valid ISO 8601 format.
 *
 * 1. Register a new seller account with randomized credentials.
 * 2. Authenticate as the seller using the authorization token.
 * 3. Call the analytics endpoint to retrieve platform statistics.
 * 4. Validate the response contains all required fields with correct types.
 * 5. Verify all numeric counts are non-negative integers.
 * 6. Verify the generated_at timestamp is in valid ISO 8601 format.
 */
export async function test_api_seller_analytics_approved_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Call analytics endpoint with seller connection
  const analytics =
    await api.functional.ecommerce.seller.analytics.at(sellerConnection);
  typia.assert(analytics);
  // 3. Validate response structure
  TestValidator.predicate(
    "products count is non-negative",
    analytics.products >= 0,
  );
  TestValidator.predicate(
    "customers count is non-negative",
    analytics.customers >= 0,
  );
  TestValidator.predicate(
    "pending cancellation requests is non-negative",
    analytics.pending_cancellation_requests >= 0,
  );
  TestValidator.predicate(
    "pending refund requests is non-negative",
    analytics.pending_refund_requests >= 0,
  );
  // 4. Validate orders structure
  TestValidator.predicate(
    "orders total is non-negative",
    analytics.orders.total >= 0,
  );
  TestValidator.predicate(
    "orders paid count is non-negative",
    analytics.orders.by_status.paid >= 0,
  );
  TestValidator.predicate(
    "orders shipped count is non-negative",
    analytics.orders.by_status.shipped >= 0,
  );
  TestValidator.predicate(
    "orders delivered count is non-negative",
    analytics.orders.by_status.delivered >= 0,
  );
  TestValidator.predicate(
    "orders cancelled count is non-negative",
    analytics.orders.by_status.cancelled >= 0,
  );
  TestValidator.predicate(
    "orders refunded count is non-negative",
    analytics.orders.by_status.refunded >= 0,
  );
  TestValidator.predicate(
    "orders partially_completed count is non-negative",
    analytics.orders.by_status.partially_completed >= 0,
  );
  // 5. Validate sellers structure
  TestValidator.predicate(
    "sellers total is non-negative",
    analytics.sellers.total >= 0,
  );
  TestValidator.predicate(
    "sellers pending count is non-negative",
    analytics.sellers.by_approval_status.pending >= 0,
  );
  TestValidator.predicate(
    "sellers approved count is non-negative",
    analytics.sellers.by_approval_status.approved >= 0,
  );
  TestValidator.predicate(
    "sellers rejected count is non-negative",
    analytics.sellers.by_approval_status.rejected >= 0,
  );
  TestValidator.predicate(
    "sellers active count is non-negative",
    analytics.sellers.by_suspension.active >= 0,
  );
  TestValidator.predicate(
    "sellers suspended count is non-negative",
    analytics.sellers.by_suspension.suspended >= 0,
  );
  TestValidator.predicate(
    "sellers banned count is non-negative",
    analytics.sellers.by_suspension.banned >= 0,
  );
  // 6. Validate timestamp format
  TestValidator.predicate(
    "generated_at is valid ISO 8601",
    !isNaN(Date.parse(analytics.generated_at)),
  );
}
