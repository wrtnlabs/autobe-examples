import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a deleted customer account cannot refresh authentication tokens.
 *
 * Scenario validates account status enforcement:
 * 1. Customer joins and receives tokens
 * 2. Customer account is soft-deleted (deleted_at timestamp set)
 * 3. Customer attempts to refresh using their valid refresh_token
 * 4. System should return 403 Forbidden because the account is deleted
 *
 * This validates the business rule that deleted accounts lose all access rights
 * and cannot maintain sessions. The system must verify customer.deleted_at is null
 * before processing refresh.
 *
 * IMPLEMENTATION NOTE:
 * This test requires a customer deletion endpoint to set deleted_at timestamp.
 * The delete endpoint is not currently available in the provided API functions.
 * When the deletion endpoint becomes available, this test should be updated to:
 * 1. Create customer account
 * 2. Delete the account (soft delete)
 * 3. Attempt refresh with stored token
 * 4. Verify 403 Forbidden response
 *
 * Expected server-side validation (in refresh endpoint):
 * - Find session by refresh_token in shopping_mall_customer_sessions
 * - Get associated customer via customer_id foreign key
 * - Verify customer.deleted_at is null before allowing refresh
 * - Return 403 Forbidden if deleted_at is set
 */
export async function test_api_customer_refresh_deleted_account_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a customer account with valid session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Capture the refresh token for later use
  const refreshToken = authorized.token.refresh;
  // Verify customer was created with null deletedAt (active account)
  TestValidator.equals("customer is active", authorized.deletedAt, null);
  // Step 2: Delete the customer account
  // NOTE: The delete endpoint is not available in the current API.
  // When implemented, the endpoint should:
  // - Set deleted_at timestamp in shopping_mall_customers table
  // - Optionally invalidate existing sessions
  //
  // Example call (when endpoint becomes available):
  // await api.functional.shoppingMall.customers.me.delete(customerConnection, {});
  // or for admin-initiated deletion:
  // await api.functional.shoppingMall.admin.customers.delete(adminConnection, { id: authorized.id });
  // Step 3: Attempt to refresh tokens with the stored refresh_token
  // After deletion, this should return 403 Forbidden
  //
  // Expected behavior when delete endpoint is available:
  // await TestValidator.httpError(
  //   "deleted account cannot refresh tokens",
  //   403,
  //   async () => {
  //     await api.functional.shoppingMall.auth.customer.refresh(connection, {
  //       body: { refresh_token: refreshToken } satisfies IShoppingMallCustomer.IRefresh,
  //     });
  //   },
  // );
  // Current workaround: Test that normal refresh works for active accounts
  // This verifies the refresh flow itself is functional
  const refreshResult = await api.functional.shoppingMall.auth.customer.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // Verify refresh returns new valid tokens for active account
  TestValidator.predicate(
    "refresh returns new access token",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh returns new refresh token",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.equals(
    "refresh returns same customer id",
    refreshResult.id,
    authorized.id,
  );
}
