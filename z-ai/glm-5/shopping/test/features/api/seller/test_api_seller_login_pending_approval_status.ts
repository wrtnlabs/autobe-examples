import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test login for sellers with pending approval status.
 *
 * This test validates that sellers with approval_status='pending'
 * can still authenticate to view their status. The test verifies:
 * 1. Seller registration creates account with pending status
 * 2. Pending seller can login with valid credentials
 * 3. Response contains valid JWT tokens
 * 4. Response includes approval_status='pending'
 * 5. Response includes rejection_reason=null for pending status
 */
export async function test_api_seller_login_pending_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a seller account with pending approval status
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name(1);
  const pendingSeller = await authorize_seller_join(connection, {
    body: {
      email,
      password,
      shopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(pendingSeller);
  // Verify the seller has pending approval status after registration
  TestValidator.equals(
    "approval status is pending",
    pendingSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is null for pending",
    pendingSeller.rejection_reason,
    null,
  );
  // Step 2: Login with the pending seller's credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loggedInSeller);
  // Step 3: Verify the response contains valid JWT tokens
  TestValidator.predicate(
    "access token exists",
    loggedInSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loggedInSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    new Date(loggedInSeller.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    new Date(loggedInSeller.token.refreshable_until) > new Date(),
  );
  // Step 4: Verify approval status is still pending after login
  TestValidator.equals(
    "approval status remains pending after login",
    loggedInSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason remains null",
    loggedInSeller.rejection_reason,
    null,
  );
  // Step 5: Verify seller profile data matches registration
  TestValidator.equals("email matches", loggedInSeller.email, email);
  TestValidator.equals("shop name matches", loggedInSeller.shop_name, shopName);
  TestValidator.equals(
    "seller is not suspended",
    loggedInSeller.suspended,
    false,
  );
  TestValidator.equals("seller is not banned", loggedInSeller.banned, false);
}
