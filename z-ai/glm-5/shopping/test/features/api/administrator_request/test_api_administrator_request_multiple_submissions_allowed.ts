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
 * Test that a customer can submit multiple administrator requests over time.
 *
 * Business Rule: Allow multiple submissions over time (no limit per requirements).
 * Do NOT check for existing pending requests (new request allowed regardless of previous).
 *
 * Test Flow:
 * 1. Create and authenticate a customer account
 * 2. Submit first administrator request
 * 3. Verify first request is created successfully
 * 4. Submit second administrator request
 * 5. Verify second request is created successfully with a new unique ID
 * 6. Validate both requests coexist without errors
 */
export async function test_api_administrator_request_multiple_submissions_allowed(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Submit first administrator request with valid reason text
  const firstRequest =
    await generate_random_shopping_mall_customer_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(firstRequest);
  // Step 3: Submit second administrator request with different reason text
  const secondRequest =
    await generate_random_shopping_mall_customer_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(secondRequest);
  // Step 4: Validate that each request has a unique UUID
  TestValidator.notEquals(
    "request IDs are unique",
    firstRequest.id,
    secondRequest.id,
  );
  // Step 5: Validate that both submissions were successful without errors
  // typia.assert validates the response structure including status
  // Both requests should be valid IShoppingMallAdministratorSession objects
}
