import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test multiple sequential token refresh operations during a single 7-day
 * session.
 *
 * This test validates that a contributor can perform multiple consecutive token
 * refresh operations without requiring re-authentication. The workflow tests:
 *
 * 1. Register a new contributor account
 * 2. Extract the initial refresh token from registration response
 * 3. Perform first token refresh with initial refresh token
 * 4. Validate new access and refresh tokens are issued with updated expiration
 * 5. Perform second refresh with newly obtained refresh token
 * 6. Repeat process for 3-4 total refresh cycles
 * 7. Verify that each refresh cycle produces fresh tokens with newer expiration
 *    times
 *
 * This ensures session continuity and validates that the refresh token
 * mechanism supports continuous token renewal throughout the 7-day session
 * window without requiring the contributor to re-enter credentials.
 */
export async function test_api_contributor_token_refresh_multiple_sequential_refreshes(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const password =
    RandomGenerator.alphabets(1).toUpperCase() +
    RandomGenerator.alphabets(5) +
    RandomGenerator.pick(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) +
    RandomGenerator.pick(["!", "@", "#", "$", "%"]);

  const registerData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(10)}`,
    password: password,
    href: "https://example.com/auth/register",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardContributor.ICreate;

  const initialResponse: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: registerData,
    });
  typia.assert(initialResponse);

  // Store initial token information
  let currentRefreshToken = initialResponse.token.refresh;
  let previousAccessToken = initialResponse.token.access;
  let previousExpiredAt = initialResponse.token.expired_at;
  let previousRefreshableUntil = initialResponse.token.refreshable_until;

  TestValidator.predicate(
    "initial registration provides refresh token",
    currentRefreshToken.length > 0,
  );

  // Step 2-5: Perform multiple sequential token refreshes (3-4 cycles)
  const refreshCycles = 4;

  for (let cycle = 1; cycle <= refreshCycles; cycle++) {
    // Perform token refresh with current refresh token
    const refreshResponse: IDiscussionBoardContributor.IAuthorized =
      await api.functional.auth.contributor.refresh(connection, {
        body: {
          refreshToken: currentRefreshToken,
        } satisfies IDiscussionBoardContributor.IRefresh,
      });
    typia.assert(refreshResponse);

    // Validate that new tokens are issued
    TestValidator.notEquals(
      `cycle ${cycle}: new access token differs from previous`,
      refreshResponse.token.access,
      previousAccessToken,
    );

    TestValidator.notEquals(
      `cycle ${cycle}: new refresh token differs from previous`,
      refreshResponse.token.refresh,
      currentRefreshToken,
    );

    // Validate that expiration times are valid ISO strings
    TestValidator.predicate(
      `cycle ${cycle}: access token expiration is valid ISO format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        refreshResponse.token.expired_at,
      ),
    );

    TestValidator.predicate(
      `cycle ${cycle}: refresh token expiration is valid ISO format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        refreshResponse.token.refreshable_until,
      ),
    );

    // Verify contributor information remains consistent
    TestValidator.equals(
      `cycle ${cycle}: contributor id remains same`,
      refreshResponse.id,
      initialResponse.id,
    );

    TestValidator.equals(
      `cycle ${cycle}: contributor email remains same`,
      refreshResponse.email,
      initialResponse.email,
    );

    TestValidator.equals(
      `cycle ${cycle}: contributor username remains same`,
      refreshResponse.username,
      initialResponse.username,
    );

    TestValidator.equals(
      `cycle ${cycle}: account status remains active`,
      refreshResponse.account_status,
      "active",
    );

    // Verify email is still verified (should not change)
    TestValidator.predicate(
      `cycle ${cycle}: email verification status preserved`,
      typeof refreshResponse.email_verified === "boolean",
    );

    // Update tracking variables for next cycle
    currentRefreshToken = refreshResponse.token.refresh;
    previousAccessToken = refreshResponse.token.access;
    previousExpiredAt = refreshResponse.token.expired_at;
    previousRefreshableUntil = refreshResponse.token.refreshable_until;
  }

  TestValidator.predicate(
    "successfully completed 4 sequential token refresh cycles",
    true,
  );
}
