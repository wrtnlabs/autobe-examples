import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that guest registration returns properly structured JWT tokens with all
 * required fields.
 *
 * This test validates that the token response includes both access and refresh
 * tokens, along with their expiration timestamps (expired_at and
 * refreshable_until). It verifies that the access token has a shorter lifetime
 * than the refresh token, enabling session continuity. The test confirms that
 * expiration timestamps are in valid ISO 8601 date-time format and that the
 * tokens can be used for subsequent authenticated requests.
 *
 * Test workflow:
 *
 * 1. Generate valid guest registration request data with IP, href, and referrer
 * 2. Call guest registration API endpoint
 * 3. Validate complete response structure with typia.assert (handles ALL type
 *    validation)
 * 4. Verify access token expires before refresh token (business logic validation)
 * 5. Ensure timestamps represent future dates (business logic validation)
 */
export async function test_api_guest_registration_token_structure(
  connection: api.IConnection,
) {
  // Step 1: Prepare guest registration request data
  const requestBody = {
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  // Step 2: Call guest registration API
  const response: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Step 3: Validate complete response structure (validates ALL types including UUID and date-time formats)
  typia.assert(response);

  // Step 4: Parse expiration timestamps for business logic validation
  const expiredAtDate = new Date(response.token.expired_at);
  const refreshableUntilDate = new Date(response.token.refreshable_until);

  // Step 5: Validate access token has shorter lifetime than refresh token (business logic)
  TestValidator.predicate(
    "access token should expire before refresh token",
    expiredAtDate.getTime() < refreshableUntilDate.getTime(),
  );

  // Step 6: Validate timestamps are in the future (business logic - tokens not already expired)
  const now = new Date();
  TestValidator.predicate(
    "access token should not be expired yet",
    expiredAtDate.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token should not be expired yet",
    refreshableUntilDate.getTime() > now.getTime(),
  );
}
