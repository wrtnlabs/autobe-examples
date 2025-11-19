import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that token refresh operations properly maintain session isolation.
 *
 * Validates that refresh tokens are strictly bound to their originating
 * sessions and cannot be used to access another contributor's authenticated
 * context. This ensures proper session isolation and prevents token hijacking
 * attacks.
 *
 * Process:
 *
 * 1. Register two different contributor accounts
 * 2. Capture refresh tokens from both accounts
 * 3. Attempt to use one contributor's refresh token while authenticated as another
 * 4. Verify that refresh tokens only work for their original sessions
 * 5. Confirm that cross-session token reuse is prevented
 */
export async function test_api_contributor_token_refresh_session_isolation(
  connection: api.IConnection,
) {
  // Step 1: Register first contributor account
  const contributor1Email = typia.random<string & tags.Format<"email">>();
  const contributor1Username = RandomGenerator.alphabets(12);
  const contributor1Password = "SecurePass123!@#";

  const firstContributorResponse: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributor1Email,
        username: contributor1Username,
        password: contributor1Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(firstContributorResponse);

  const contributor1RefreshToken = firstContributorResponse.token.refresh;
  TestValidator.predicate(
    "first contributor refresh token should be valid string",
    typeof contributor1RefreshToken === "string" &&
      contributor1RefreshToken.length > 0,
  );

  // Step 2: Register second contributor account
  const contributor2Email = typia.random<string & tags.Format<"email">>();
  const contributor2Username = RandomGenerator.alphabets(12);
  const contributor2Password = "AnotherPass456!@#";

  const secondContributorResponse: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributor2Email,
        username: contributor2Username,
        password: contributor2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(secondContributorResponse);

  const contributor2RefreshToken = secondContributorResponse.token.refresh;
  TestValidator.predicate(
    "second contributor refresh token should be valid string",
    typeof contributor2RefreshToken === "string" &&
      contributor2RefreshToken.length > 0,
  );

  // Step 3: Verify that refresh tokens are different
  TestValidator.notEquals(
    "refresh tokens for different contributors should be different",
    contributor1RefreshToken,
    contributor2RefreshToken,
  );

  // Step 4: Test that contributor1's refresh token still works for contributor1
  const contributor1RefreshResult: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.refresh(connection, {
      body: {
        refreshToken: contributor1RefreshToken,
      } satisfies IDiscussionBoardContributor.IRefresh,
    });
  typia.assert(contributor1RefreshResult);

  TestValidator.equals(
    "refreshed token should belong to first contributor",
    contributor1RefreshResult.id,
    firstContributorResponse.id,
  );
  TestValidator.equals(
    "refreshed email should match first contributor",
    contributor1RefreshResult.email,
    contributor1Email,
  );

  // Step 5: Test that contributor2's refresh token still works for contributor2
  const contributor2RefreshResult: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.refresh(connection, {
      body: {
        refreshToken: contributor2RefreshToken,
      } satisfies IDiscussionBoardContributor.IRefresh,
    });
  typia.assert(contributor2RefreshResult);

  TestValidator.equals(
    "refreshed token should belong to second contributor",
    contributor2RefreshResult.id,
    secondContributorResponse.id,
  );
  TestValidator.equals(
    "refreshed email should match second contributor",
    contributor2RefreshResult.email,
    contributor2Email,
  );

  // Step 6: Verify that tokens are distinct - session isolation is maintained
  TestValidator.notEquals(
    "access tokens for different contributors should be different",
    contributor1RefreshResult.token.access,
    contributor2RefreshResult.token.access,
  );

  TestValidator.notEquals(
    "new refresh tokens should be different for different contributors",
    contributor1RefreshResult.token.refresh,
    contributor2RefreshResult.token.refresh,
  );

  // Step 7: Verify that using contributor1's token doesn't grant access to contributor2's session
  // Create an unauthenticated connection for testing cross-session token usage
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Attempt to refresh with contributor1's token in unauthenticated context
  const attemptedCrossSessionRefresh: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.refresh(unauthConnection, {
      body: {
        refreshToken: contributor1RefreshToken,
      } satisfies IDiscussionBoardContributor.IRefresh,
    });
  typia.assert(attemptedCrossSessionRefresh);

  // Verify the result belongs to contributor1, not contributor2
  TestValidator.equals(
    "cross-session refresh attempt should return tokens for original contributor",
    attemptedCrossSessionRefresh.id,
    firstContributorResponse.id,
  );

  TestValidator.notEquals(
    "cross-session refresh should not return contributor2's ID",
    attemptedCrossSessionRefresh.id,
    secondContributorResponse.id,
  );
}
