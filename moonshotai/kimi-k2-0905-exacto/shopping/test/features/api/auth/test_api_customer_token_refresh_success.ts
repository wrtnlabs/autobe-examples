import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test successful customer token refresh operation using valid refresh token.
 *
 * This test validates the complete token refresh flow for customer
 * authentication:
 *
 * 1. Generates realistic customer authorization data using the SDK's random
 *    function
 * 2. Uses the refresh token to request new tokens via the refresh endpoint
 * 3. Verifies the response contains valid customer profile data and new tokens
 * 4. Validates that new tokens have updated expiration timestamps
 * 5. Ensures the refresh token mechanism maintains session continuity
 * 6. Confirms authorization headers are properly updated by the SDK
 *
 * The test covers JWT token structure validation, expiration timestamp updates,
 * customer profile data consistency, and proper session management.
 */
export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
) {
  // Generate realistic customer authorization data using the SDK's random function
  // This simulates having valid tokens from a previous authentication
  const mockAuthorizedCustomer = api.functional.auth.customer.refresh.random();
  const validRefreshToken = mockAuthorizedCustomer.token.refresh;

  // Store original connection headers to verify they're updated
  const originalHeaders = { ...connection.headers };

  // Test the refresh endpoint with valid refresh token
  const refreshResponse: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    });

  // Validate the response structure and completeness
  typia.assert(refreshResponse);

  // Verify customer profile data is complete and valid
  TestValidator.predicate(
    "customer has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refreshResponse.id,
    ),
  );

  TestValidator.predicate(
    "customer email has valid format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      refreshResponse.email,
    ),
  );

  TestValidator.predicate(
    "customer name is not empty",
    refreshResponse.name.length > 0,
  );

  TestValidator.predicate(
    "customer name has reasonable length",
    refreshResponse.name.length >= 1 && refreshResponse.name.length <= 255,
  );

  // Validate customer status and verification fields
  TestValidator.equals("customer account status", refreshResponse.status, true);

  TestValidator.predicate(
    "email verification status is boolean",
    typeof refreshResponse.is_email_verified === "boolean",
  );

  TestValidator.predicate(
    "phone verification status is boolean",
    typeof refreshResponse.is_phone_verified === "boolean",
  );

  TestValidator.predicate(
    "marketing opt-in is boolean",
    typeof refreshResponse.marketing_opt_in === "boolean",
  );

  // Validate account type is one of the allowed values
  TestValidator.predicate(
    "account type is valid",
    ["standard", "premium", "vip"].includes(refreshResponse.account_type),
  );

  TestValidator.predicate(
    "language code has reasonable length",
    refreshResponse.language.length >= 2 &&
      refreshResponse.language.length <= 10,
  );

  TestValidator.predicate(
    "timezone has reasonable length",
    refreshResponse.timezone.length >= 3 &&
      refreshResponse.timezone.length <= 50,
  );

  // Validate token structure and content
  TestValidator.predicate(
    "access token is present and not empty",
    refreshResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is present and not empty",
    refreshResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token has valid expiration timestamp format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      refreshResponse.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refresh token has valid expiration timestamp format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      refreshResponse.token.refreshable_until,
    ),
  );

  // Verify token expiration timestamps are in the future
  const currentTime = new Date();
  const accessTokenExpiry = new Date(refreshResponse.token.expired_at);
  const refreshTokenExpiry = new Date(refreshResponse.token.refreshable_until);

  TestValidator.predicate(
    "access token expires in the future",
    accessTokenExpiry > currentTime,
  );

  TestValidator.predicate(
    "refresh token expires in the future",
    refreshTokenExpiry > currentTime,
  );

  // Verify timestamp fields have valid formats
  TestValidator.predicate(
    "created_at has valid timestamp format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      refreshResponse.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at has valid timestamp format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      refreshResponse.updated_at,
    ),
  );

  // Test optional avatar field if present
  if (refreshResponse.avatar !== null && refreshResponse.avatar !== undefined) {
    TestValidator.predicate(
      "avatar has valid URI format",
      /^https?:\/\/.+/.test(refreshResponse.avatar),
    );
  }

  // Test optional birth_date field if present
  if (
    refreshResponse.birth_date !== null &&
    refreshResponse.birth_date !== undefined
  ) {
    TestValidator.predicate(
      "birth_date has valid date format",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(
        refreshResponse.birth_date,
      ),
    );
  }

  // Test optional gender field if present
  if (refreshResponse.gender !== null && refreshResponse.gender !== undefined) {
    TestValidator.predicate(
      "gender has valid value",
      ["male", "female", "other", "prefer_not_to_say"].includes(
        refreshResponse.gender,
      ),
    );
  }

  // Verify authorization header was updated by the SDK
  TestValidator.notEquals(
    "connection headers were updated with new access token",
    connection.headers?.Authorization,
    originalHeaders.Authorization,
  );

  TestValidator.predicate(
    "new authorization header contains access token",
    connection.headers?.Authorization === refreshResponse.token.access,
  );

  // Test sequential refresh operations to ensure session continuity
  const secondRefreshToken = refreshResponse.token.refresh;
  const secondRefreshTime = new Date();

  const secondRefreshResponse: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: {
        refresh_token: secondRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    });

  typia.assert(secondRefreshResponse);

  // Verify customer data consistency across refreshes
  TestValidator.equals(
    "customer ID remains consistent across refreshes",
    secondRefreshResponse.id,
    refreshResponse.id,
  );

  TestValidator.equals(
    "customer email remains consistent across refreshes",
    secondRefreshResponse.email,
    refreshResponse.email,
  );

  TestValidator.equals(
    "customer name remains consistent across refreshes",
    secondRefreshResponse.name,
    refreshResponse.name,
  );

  // Verify new tokens are different (token rotation working)
  TestValidator.notEquals(
    "new access token is different from previous",
    secondRefreshResponse.token.access,
    refreshResponse.token.access,
  );

  TestValidator.notEquals(
    "new refresh token is different from previous",
    secondRefreshResponse.token.refresh,
    refreshResponse.token.refresh,
  );

  // Verify authorization header was updated again
  TestValidator.notEquals(
    "connection headers updated with second refresh",
    connection.headers?.Authorization,
    refreshResponse.token.access,
  );

  TestValidator.equals(
    "second refresh updates authorization header correctly",
    connection.headers?.Authorization,
    secondRefreshResponse.token.access,
  );

  // Verify new expiration times are updated and still in the future
  const newAccessExpiry = new Date(secondRefreshResponse.token.expired_at);
  const newRefreshExpiry = new Date(
    secondRefreshResponse.token.refreshable_until,
  );

  TestValidator.predicate(
    "new access token expires in the future",
    newAccessExpiry > secondRefreshTime,
  );

  TestValidator.predicate(
    "new refresh token expires in the future",
    newRefreshExpiry > secondRefreshTime,
  );

  TestValidator.predicate(
    "new access token has later expiration than previous",
    newAccessExpiry > accessTokenExpiry,
  );

  TestValidator.predicate(
    "new refresh token has later expiration than previous",
    newRefreshExpiry > refreshTokenExpiry,
  );

  // Test with invalid refresh token to ensure proper error handling
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: {
          refresh_token: "invalid_refresh_token_12345",
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );

  // Test with empty refresh token
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );

  // Final validation: verify all required customer fields are present
  TestValidator.predicate(
    "all required customer profile fields are present",
    refreshResponse.id !== undefined &&
      refreshResponse.email !== undefined &&
      refreshResponse.name !== undefined &&
      refreshResponse.status !== undefined &&
      refreshResponse.is_email_verified !== undefined &&
      refreshResponse.is_phone_verified !== undefined &&
      refreshResponse.account_type !== undefined &&
      refreshResponse.language !== undefined &&
      refreshResponse.timezone !== undefined &&
      refreshResponse.marketing_opt_in !== undefined &&
      refreshResponse.created_at !== undefined &&
      refreshResponse.updated_at !== undefined &&
      refreshResponse.token !== undefined,
  );
}
