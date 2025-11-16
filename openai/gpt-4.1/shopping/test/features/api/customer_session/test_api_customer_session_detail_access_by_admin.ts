import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Verify that a platform admin can successfully retrieve details for a specific
 * customer session by session ID.
 *
 * 1. Register a new admin using the join endpoint and authenticate as the admin.
 * 2. As the admin, simulate or prepare an existing customer session record (since
 *    only the admin join and session fetch are provided in materials). For the
 *    purpose of this test, generate random UUIDs for customerId and sessionId
 *    and use the at API to fetch details.
 * 3. Validate that the returned session structure matches the expected schema,
 *    including audit fields like creation/expiration time, IP, href, and
 *    referrer, and proves that raw auth tokens are never exposed in the
 *    response.
 *
 * Note: Negative/denied access scenarios cannot be implemented directly (due to
 * lack of customer session creation or login API in available functions), so
 * this test is limited to schema/type validation with random identified records
 * as representative of the endpoint mechanics.
 */
export async function test_api_customer_session_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new admin
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. As admin, attempt to fetch a customer session (simulate IDs, as no customer/session creation is in available functions)
  const fetched: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.sessions.at(connection, {
      customerId: typia.random<string & tags.Format<"uuid">>(),
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(fetched);

  // 3. Business and schema validations
  // - Validate basic fields presence and type via typia.assert() (already ensures all are present and correctly typed)
  TestValidator.predicate(
    "customer session has valid UUID id",
    typeof fetched.id === "string" && fetched.id.length > 0,
  );
  TestValidator.predicate(
    "customer field is present",
    fetched.customer !== undefined && fetched.customer !== null,
  );
  TestValidator.predicate("ip is string", typeof fetched.ip === "string");
  TestValidator.predicate("href is string", typeof fetched.href === "string");
  TestValidator.predicate(
    "referrer is string",
    typeof fetched.referrer === "string",
  );
  TestValidator.predicate(
    "created_at has correct format",
    typeof fetched.created_at === "string" && fetched.created_at.length > 0,
  );
  // expired_at is nullable/optional: must be string or null/undefined
  if (fetched.expired_at !== undefined && fetched.expired_at !== null) {
    TestValidator.predicate(
      "expired_at is string if present",
      typeof fetched.expired_at === "string",
    );
  }
  // - Tokens must NOT be exposed: nothing in response structure includes raw tokens
  TestValidator.predicate(
    "session object exposes NO tokens",
    !("token" in fetched),
  );
}
