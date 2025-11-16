import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that a member can perform multiple sequential token refreshes to
 * maintain a long-lived session across many refresh cycles.
 *
 * Validates that each refresh operation successfully issues new tokens with
 * updated timestamps, and that subsequent refreshes continue to work. Tests the
 * resilience of the token refresh mechanism for users who maintain active
 * sessions over extended periods with periodic refresh operations.
 *
 * Test flow:
 *
 * 1. Create initial member account via join endpoint
 * 2. Extract the refresh token from the initial authorization response
 * 3. Perform 5 sequential refresh cycles
 * 4. For each refresh cycle:
 *
 *    - Use the current refresh token to call the refresh endpoint
 *    - Verify the response contains new access and refresh tokens
 *    - Verify the tokens are properly formatted and not stale
 *    - Extract the new refresh token for the next cycle
 * 5. Confirm all refresh operations completed successfully with valid token
 *    updates
 */
export async function test_api_member_token_refresh_multiple_sequential_refreshes(
  connection: api.IConnection,
) {
  // Step 1: Create initial member account
  const initialMember = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: "SecurePassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(initialMember);

  // Step 2: Extract the initial refresh token
  let currentRefreshToken = initialMember.token.refresh;
  let previousAccessToken = initialMember.token.access;

  // Step 3-4: Perform 5 sequential refresh cycles
  const REFRESH_CYCLES = 5;
  for (let i = 0; i < REFRESH_CYCLES; i++) {
    // Perform refresh operation
    const refreshResult = await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: currentRefreshToken,
      } satisfies ICommunityPlatformMember.IRefresh,
    });
    typia.assert(refreshResult);

    // Verify tokens are valid and new
    TestValidator.predicate(
      `refresh cycle ${i + 1}: response contains valid tokens`,
      refreshResult.token.access !== "" && refreshResult.token.refresh !== "",
    );

    // Verify the new access token is different from the previous one
    TestValidator.notEquals(
      `refresh cycle ${i + 1}: new access token should differ from previous`,
      refreshResult.token.access,
      previousAccessToken,
    );

    // Verify expiration timestamps are valid ISO 8601 dates
    TestValidator.predicate(
      `refresh cycle ${i + 1}: expired_at is valid ISO 8601 format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        refreshResult.token.expired_at,
      ),
    );

    TestValidator.predicate(
      `refresh cycle ${i + 1}: refreshable_until is valid ISO 8601 format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        refreshResult.token.refreshable_until,
      ),
    );

    // Update tokens for next iteration
    previousAccessToken = refreshResult.token.access;
    currentRefreshToken = refreshResult.token.refresh;
  }

  // Step 5: Confirm final state
  TestValidator.predicate(
    "all refresh cycles completed successfully with valid tokens",
    currentRefreshToken !== "" && previousAccessToken !== "",
  );
}
