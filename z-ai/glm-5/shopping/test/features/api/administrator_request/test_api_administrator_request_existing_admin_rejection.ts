import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_requests_create } from "../../../generate/generate_random_shopping_mall_customer_requests_create";
import { prepare_random_shopping_mall_administrator_session } from "../../../prepare/prepare_random_shopping_mall_administrator_session";

/**
 * Test that users who already hold an administrator role cannot submit new
 * administrator requests.
 *
 * Business Rule Being Tested:
 * - From requirements: 'Verify user is NOT an administrator (reject if already administrator)'
 * - Error handling specifies: '403 if user is already an administrator'
 *
 * Prerequisites:
 * - Customer account created via join endpoint
 *
 * Test Execution:
 * 1. Authenticate as a newly created customer
 * 2. Submit an administrator request (user becomes administrator upon request creation)
 * 3. Attempt to submit another administrator request
 * 4. Verify the request is rejected with 403 Forbidden
 *
 * Validation Points:
 * - First request succeeds and returns administrator session
 * - Second request fails with 403 (Forbidden) because user is already an administrator
 */
export async function test_api_administrator_request_existing_admin_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Submit first administrator request - should succeed
  // After submission, the user becomes an administrator (receives session)
  const session = await generate_random_shopping_mall_customer_requests_create(
    customerConnection,
    {},
  );
  typia.assert(session);
  // Step 3: Attempt to submit another administrator request
  // Step 4: Verify rejection with 403 Forbidden (user is already an administrator)
  await TestValidator.httpError(
    "existing administrator cannot submit new request",
    403,
    async () => {
      await generate_random_shopping_mall_customer_requests_create(
        customerConnection,
        {},
      );
    },
  );
}
