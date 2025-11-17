import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest account using auth.guest.join with valid data for required fields: name, href, referrer, password; email and ip may be omitted or given.
  // Step 2: Validate the returned IShoppingMallGuest.IAuthorized response with typia.assert.
  // Step 3: Extract refresh_token from the join response token.
  // Step 4: Call auth.guest.refresh with the refresh_token.
  // Step 5: Validate the returned IShoppingMallGuest.IAuthorized response with typia.assert.
  // Step 6: Assert that the new access token is different from the old access token.
  // Step 7: Assert that the new refresh token is different from the old refresh token.
}
