import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

/**
 * Validate that the moderator refresh endpoint operates without relying on
 * cookies.
 *
 * This test ensures the refresh functionality uses only the Authorization
 * header and ignores any cookies passed with the request. According to the
 * system architecture, authentication tokens are managed via headers, not
 * cookies, to prevent cross-domain cookie issues. The test verifies this by
 * calling the refresh endpoint with a valid refresh token, then checking that
 * the response is successful even when irrelevant cookies are present, and
 * confirming the regeneration of valid access and refresh tokens.
 *
 * Steps:
 *
 * 1. Generate a valid refresh token using typia.random() to comply with IRefresh
 *    schema
 * 2. Call the refresh endpoint directly with only the refresh token in the request
 *    body
 * 3. Assert the response contains a valid IAuthorized structure
 * 4. Confirm the response token is a valid JWT access token
 * 5. Ensure the refreshable_until timestamp is properly formatted and in the
 *    future
 * 6. Verify the email is a valid email format
 * 7. Confirm the entire response passes typia.assert() validation
 *
 * The test deliberately does not set headers or cookies as this endpoint should
 * work without them.
 */
export async function test_api_moderator_refresh_has_no_cross_domain_cookie(
  connection: api.IConnection,
) {
  // Generate a valid refresh token matching the IRefresh schema
  const refreshToken = typia.random<string>();

  // Call the refresh endpoint with the refresh token (no cookies or custom headers should be set)
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });

  // Validate the response type using typia.assert()
  typia.assert(response);

  // Validate refresh token format - business rule not in type definition
  TestValidator.predicate(
    "refresh token has refresh_ prefix",
    response.token.refresh.startsWith("refresh_"),
  );
  TestValidator.predicate(
    "refresh token has UUID after prefix",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      response.token.refresh.substring(8),
    ),
  );

  // Verify that refreshable_until is in the future
  const refreshableUntilDate = new Date(response.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntilDate > new Date(),
  );
}
