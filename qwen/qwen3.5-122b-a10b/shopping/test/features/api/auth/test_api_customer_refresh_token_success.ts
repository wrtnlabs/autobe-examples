import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer JWT token refresh with valid refresh token.
 *
 * Validates the token refresh workflow where a customer successfully obtains new access and refresh token pairs using a valid refresh token from an active session. The test ensures token rotation occurs correctly while maintaining customer identity consistency.
 *
 * The test verifies that the system properly validates the refresh token format, checks session expiration, confirms the customer account is active (not deleted), and issues new token pairs with updated expiration timestamps. Both access and refresh tokens are rotated on successful refresh.
 *
 * 1. Customer registers with random credentials via authorize_customer_join.
 * 2. Extract refresh token from initial authorization response.
 * 3. Create customer connection for refresh operation.
 * 4. Call refresh endpoint with valid refresh token.
 * 5. Validates response contains all customer fields (id, display_name, phone_number, timestamps).
 * 6. Validates token object contains all required fields (access, refresh, expired_at, refreshable_until).
 * 7. Validates token rotation (new access and refresh tokens differ from originals).
 * 8. Validates customer identity remains consistent across refresh.
 * 9. Validates timestamps are properly formatted ISO 8601 date-time strings.
 */
export async function test_api_customer_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and get initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // 2. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Refresh token using the refresh endpoint
  const refreshedAuth = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IEcommerceCustomer.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate customer identity consistency
  TestValidator.equals("customer id matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "display name matches",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals(
    "phone number matches",
    refreshedAuth.phone_number,
    initialAuth.phone_number,
  );
  TestValidator.equals(
    "created at matches",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    refreshedAuth.updated_at,
    initialAuth.updated_at,
  );
  TestValidator.equals(
    "deleted at matches",
    refreshedAuth.deleted_at,
    initialAuth.deleted_at,
  );
  // 5. Validate token rotation (new tokens differ from originals)
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // 6. Validate token object structure
  TestValidator.predicate(
    "access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshedAuth.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshedAuth.token.refreshable_until,
    ),
  );
  // 7. Validate expiration times are in the future
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in future",
    new Date(refreshedAuth.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(refreshedAuth.token.refreshable_until) > now,
  );
}
