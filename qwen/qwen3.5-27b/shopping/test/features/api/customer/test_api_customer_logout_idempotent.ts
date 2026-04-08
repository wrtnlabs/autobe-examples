import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the idempotent behavior of the customer logout operation when called multiple times or when no active session exists.
 *
 * Validates that the logout endpoint gracefully handles repeated calls without errors, ensuring the operation is truly idempotent. This test verifies that calling logout on an already-terminated session does not produce an error and maintains system stability.
 *
 * Special attention is given to verifying that the system handles edge cases where the session has already been invalidated, ensuring robust error handling and preventing potential crashes or unexpected behavior from repeated logout attempts.
 *
 * 1. Register a new customer account with valid credentials using the join endpoint.
 * 2. Verify the customer receives valid access and refresh tokens upon registration.
 * 3. Call the logout endpoint with the authenticated customer's connection (first logout).
 * 4. Verify the first logout returns HTTP 204 No Content (void response).
 * 5. Call the logout endpoint again with the same (now invalid) connection (second logout).
 * 6. Verify the second logout also returns HTTP 204 No Content, confirming idempotent behavior.
 * 7. Confirm that no errors are thrown from repeated logout attempts.
 */
export async function test_api_customer_logout_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. First logout - should succeed with 204 No Content
  await api.functional.shoppingMall.customer.logout(customerConnection);
  // 3. Second logout with the same (now invalid) connection - should also succeed with 204 No Content
  await api.functional.shoppingMall.customer.logout(customerConnection);
  // 4. Third logout to further verify idempotency - should still succeed
  await api.functional.shoppingMall.customer.logout(customerConnection);
}
