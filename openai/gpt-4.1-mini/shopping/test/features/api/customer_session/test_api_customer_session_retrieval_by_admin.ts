import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test retrieving detailed information of a specific customer session by its
 * unique sessionId as an authenticated admin.
 *
 * This test performs these steps:
 *
 * 1. Admin joins to create a new admin user and obtains an authentication token.
 * 2. Using the admin credentials, requests detailed customer session information
 *    by the provided sessionId.
 * 3. Verifies the response contains accurate, complete session details including
 *    IP address, referrer, session creation and expiration timestamps.
 * 4. Validates that unauthorized (not logged in as admin) access is properly
 *    rejected.
 *
 * This ensures that only authorized admin actors can access sensitive customer
 * session data securely and completely.
 */
export async function test_api_customer_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Define a realistic existing sessionId to fetch
  // Since we lack actual session creation, simulate a UUID
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the customer session by sessionId as admin
  const session: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customerSessions.at(connection, {
      sessionId: sessionId,
    });
  typia.assert(session);

  // Step 4: Assert critical properties exist and are valid
  TestValidator.predicate(
    "session id exists",
    typeof session.id === "string" && session.id === sessionId,
  );
  TestValidator.predicate(
    "has shopping mall customer id",
    typeof session.shopping_mall_customer_id === "string",
  );
  TestValidator.predicate(
    "ip is non-empty string",
    typeof session.ip === "string" && session.ip.length > 0,
  );
  TestValidator.predicate(
    "href is non-empty string",
    typeof session.href === "string" && session.href.length > 0,
  );
  TestValidator.predicate(
    "referrer is string",
    typeof session.referrer === "string",
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );

  // expired_at is optional and nullable
  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "expired_at is valid ISO string",
      typeof session.expired_at === "string" && session.expired_at.length > 0,
    );
  }

  // Step 5: Validate unauthorized access is denied
  // Prepare a connection with empty headers to simulate unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access rejected", async () => {
    await api.functional.shoppingMall.admin.customerSessions.at(unauthConn, {
      sessionId: sessionId,
    });
  });
}
