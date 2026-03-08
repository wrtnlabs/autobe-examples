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
 * Test successful customer token refresh flow.
 *
 * Validates that:
 * 1. A customer can obtain initial tokens through join
 * 2. The refresh token can be used to obtain new tokens
 * 3. New access token is different from the initial access token
 * 4. Customer profile information matches the original registration
 * 5. Expiration timestamps are valid
 */
export async function test_api_customer_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer account via join
  const customerConnection: api.IConnection = { host: connection.host };
  const initialResponse: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  typia.assert(initialResponse);
  const customerId = initialResponse.id;
  const customerEmail = initialResponse.email;
  const initialAccessToken = initialResponse.token.access;
  const initialRefreshToken = initialResponse.token.refresh;
  const initialExpiredAt = initialResponse.token.expired_at;
  // Step 2: Call refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedResponse: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_refresh(refreshConnection, {
      body: {
        refresh: initialRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    });
  typia.assert(refreshedResponse);
  // Step 3: Verify new access token is different from initial
  TestValidator.notEquals(
    "new access token should be different from initial",
    refreshedResponse.token.access,
    initialAccessToken,
  );
  // Step 4: Verify customer profile matches
  TestValidator.equals(
    "customer id should match",
    refreshedResponse.id,
    customerId,
  );
  TestValidator.equals(
    "customer email should match",
    refreshedResponse.email,
    customerEmail,
  );
  // Step 5: Verify expiration timestamps are valid (expired_at in future)
  const now = new Date();
  const newExpiredAt = new Date(refreshedResponse.token.expired_at);
  TestValidator.predicate(
    "new expired_at should be in the future",
    newExpiredAt > now,
  );
  // Step 6: Verify refreshable_until is valid (within reasonable bounds)
  const newRefreshableUntil = new Date(
    refreshedResponse.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until should be in the future",
    newRefreshableUntil > now,
  );
  // Step 7: Verify new expiration is similar to or extends the session
  TestValidator.predicate(
    "refreshable_until should be at least as long as initial",
    newRefreshableUntil >= new Date(initialResponse.token.refreshable_until),
  );
}
