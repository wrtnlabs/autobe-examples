import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
 * Test successful seller token refresh with valid refresh token.
 *
 * Validates the seller token refresh workflow by registering a new seller account, obtaining initial tokens, and then successfully refreshing the access token using the refresh token. Ensures token rotation occurs and seller account status remains valid throughout the process.
 *
 * The test verifies that new tokens are generated with updated expiration timestamps, the seller account maintains its approved status, and all response fields conform to the expected authorization token structure.
 *
 * 1. Register a new seller account with randomized credentials.
 * 2. Extract the initial refresh token from the registration response.
 * 3. Call the refresh endpoint with the valid refresh token.
 * 4. Validate the new access token differs from the original (token rotation).
 * 5. Validate the new refresh token differs from the original (token rotation).
 * 6. Verify expiration timestamps are in the future.
 * 7. Confirm seller account status remains approved and not suspended/banned.
 */
export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // 2. Refresh the token using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IEcommerceSeller.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation - new tokens should be different
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 4. Validate expiration timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expires in future",
    new Date(refreshedAuth.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refresh token expires in future",
    new Date(refreshedAuth.token.refreshable_until) > now,
  );
  // 5. Validate seller account status remains valid
  TestValidator.equals(
    "seller approval status",
    refreshedAuth.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "seller not suspended",
    refreshedAuth.is_suspended === false,
  );
  TestValidator.predicate(
    "seller not banned",
    refreshedAuth.is_banned === false,
  );
  // 6. Validate seller identity is preserved
  TestValidator.equals("seller ID preserved", initialAuth.id, refreshedAuth.id);
}
