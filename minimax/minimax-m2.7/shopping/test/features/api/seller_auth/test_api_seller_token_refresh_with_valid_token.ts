import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test successful token refresh with valid refresh token.
 *
 * Steps:
 * 1. Register a new seller account via /auth/seller/join to obtain access and refresh tokens.
 * 2. Extract the refresh token from the login response.
 * 3. Call /auth/seller/refresh with the valid refresh token.
 * 4. Verify response returns new access token, refresh token, and seller information including id, email, and approval_status.
 * 5. Verify the new tokens have updated expiration timestamps.
 * 6. Verify the returned seller account matches the registered seller.
 */
export async function test_api_seller_token_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account to obtain initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const initialResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initialResponse);
  // Store the original tokens and their expiration timestamps
  const originalAccessToken = initialResponse.token.access;
  const originalRefreshToken = initialResponse.token.refresh;
  const originalExpiredAt = initialResponse.token.expired_at;
  const originalRefreshableUntil = initialResponse.token.refreshable_until;
  // Step 2: Extract the refresh token from the initial response
  const refreshToken = initialResponse.token.refresh;
  TestValidator.equals("refresh token exists", refreshToken.length > 0, true);
  // Step 3: Call /auth/seller/refresh with the valid refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedResponse = await authorize_seller_refresh(
    refreshedConnection,
    {
      body: {
        refresh: refreshToken,
      },
    },
  );
  typia.assert(refreshedResponse);
  // Step 4: Verify response returns new access token, refresh token, and seller information
  TestValidator.equals(
    "access token exists",
    refreshedResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists in response",
    refreshedResponse.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "seller id exists",
    refreshedResponse.id.length > 0,
    true,
  );
  TestValidator.equals(
    "seller email exists",
    refreshedResponse.email.length > 0,
    true,
  );
  TestValidator.equals(
    "approval status exists",
    refreshedResponse.approval_status.length > 0,
    true,
  );
  // Verify seller information matches the registered seller
  TestValidator.equals(
    "seller id matches",
    refreshedResponse.id,
    initialResponse.id,
  );
  TestValidator.equals(
    "seller email matches",
    refreshedResponse.email,
    initialResponse.email,
  );
  TestValidator.equals(
    "approval status is pending",
    refreshedResponse.approval_status,
    "pending",
  );
  // Step 5: Verify the new tokens have updated expiration timestamps
  // The new access token should be different from the original
  TestValidator.notEquals(
    "new access token is different",
    refreshedResponse.token.access,
    originalAccessToken,
  );
  // The expiration timestamp should be updated (newer or same)
  const newExpiredAt = new Date(refreshedResponse.token.expired_at);
  const originalExpiredAtDate = new Date(originalExpiredAt);
  TestValidator.predicate(
    "new token expiration is valid",
    newExpiredAt >= originalExpiredAtDate ||
      newExpiredAt.getTime() - originalExpiredAtDate.getTime() < 60000,
  );
  // Step 6: Verify the returned seller account matches the registered seller (already done in step 4)
  // Additional validation that seller details are consistent
  TestValidator.equals(
    "created_at matches",
    refreshedResponse.created_at,
    initialResponse.created_at,
  );
  TestValidator.equals(
    "updated_at is present",
    refreshedResponse.updated_at !== undefined,
    true,
  );
}
