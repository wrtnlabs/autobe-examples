import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerRefresh";

export async function test_api_seller_refresh_failure_for_locked_credentials_or_inactive_seller(
  connection: api.IConnection,
) {
  // 1. Prepare a structurally valid refresh request payload
  // We generate an opaque random string to simulate a refresh token format.
  const requestBody = {
    refreshToken: RandomGenerator.alphaNumeric(64),
  } satisfies IShoppingMallSellerRefresh.IRequest;

  // 2. Call POST /auth/seller/refresh with the prepared refreshToken and
  //    assert that it fails instead of returning an authorized seller session.
  //
  // We only assert that an error is thrown (i.e., no IShoppingMallSeller.IAuthorized
  // payload is returned). We do not assert on HTTP status codes or error
  // messages in accordance with global testing rules.
  await TestValidator.error(
    "seller refresh must fail for unusable refresh token and not return authorized payload",
    async () => {
      // If this call does not throw, TestValidator.error will fail the test.
      // A thrown HttpError (or other error) indicates that the refresh attempt
      // could not be performed with this token, which matches the business
      // expectation for disallowed/invalid refresh tokens.
      await api.functional.auth.seller.refresh(connection, {
        body: requestBody,
      });
    },
  );
}
