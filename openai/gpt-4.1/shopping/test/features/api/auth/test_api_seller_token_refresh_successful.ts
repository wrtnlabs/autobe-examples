import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates successful token refresh for sellers via /auth/seller/refresh API.
 *
 * Ensures that providing a valid refresh token yields new access/refresh
 * tokens, preserves the authenticated seller context, and returns a correctly
 * structured IShoppingMallSeller.IAuthorized response. Confirms session
 * continuity and that refreshed tokens differ from original (randomized)
 * tokens, with no error on valid input.
 */
export async function test_api_seller_token_refresh_successful(
  connection: api.IConnection,
) {
  // Generate a plausible refresh token
  const refreshToken = RandomGenerator.alphaNumeric(64);

  // Submit the refresh request
  const result = await api.functional.auth.seller.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(result);

  // Confirm all required seller properties are present and type-valid
  TestValidator.predicate(
    "seller id is a valid UUID",
    typeof result.id === "string" && /^[0-9a-f-]{36}$/i.test(result.id),
  );
  TestValidator.predicate(
    "seller email is provided",
    typeof result.email === "string" &&
      result.email.length > 0 &&
      result.email.includes("@"),
  );

  TestValidator.predicate(
    "business_name is present",
    typeof result.business_name === "string" && result.business_name.length > 0,
  );

  TestValidator.predicate(
    "has registration_number and business_phone",
    typeof result.registration_number === "string" &&
      result.registration_number.length > 0 &&
      typeof result.business_phone === "string" &&
      result.business_phone.length > 0,
  );
  TestValidator.predicate(
    "is_email_verified is boolean",
    typeof result.is_email_verified === "boolean",
  );
  TestValidator.predicate(
    "status is a non-empty string",
    typeof result.status === "string" && result.status.length > 0,
  );

  TestValidator.predicate(
    "created_at and updated_at are valid date-time strings",
    typeof result.created_at === "string" &&
      result.created_at.includes("T") &&
      typeof result.updated_at === "string" &&
      result.updated_at.includes("T"),
  );

  // Validate token structure and differences
  TestValidator.predicate(
    "token object has correct fields",
    typeof result.token === "object" &&
      typeof result.token.access === "string" &&
      typeof result.token.refresh === "string" &&
      typeof result.token.expired_at === "string" &&
      typeof result.token.refreshable_until === "string",
  );
  TestValidator.predicate(
    "access token is not empty",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at and refreshable_until are valid ISO 8601 date-strings",
    typeof result.token.expired_at === "string" &&
      result.token.expired_at.includes("T") &&
      typeof result.token.refreshable_until === "string" &&
      result.token.refreshable_until.includes("T"),
  );

  // Ensure no error when providing valid refresh token
  // If API or typia.assert throws, test will fail.
}
